import React, { PropTypes } from 'react';
import TableRow from './TableRow';
import TableHeader from './TableHeader';
import { warningOnce } from './utils';
import ColumnManager from './ColumnManager';
import createStore from './createStore';

export default class Table extends React.Component {
  static propTypes = {
    data: PropTypes.array,
    columns: PropTypes.array,
    prefixCls: PropTypes.string,
    bodyStyle: PropTypes.object,
    style: PropTypes.object,
    rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    rowClassName: PropTypes.func,
    childrenColumnName: PropTypes.string,
    indentSize: PropTypes.number,
    onRowClick: PropTypes.func,
    onRowDoubleClick: PropTypes.func,
    showHeader: PropTypes.bool,
    title: PropTypes.func,
    footer: PropTypes.func,
    emptyText: PropTypes.func,
    rowRef: PropTypes.func,
    getBodyWrapper: PropTypes.func,
    children: PropTypes.node,
  }

  static defaultProps = {
    data: [],
    rowKey: 'key',
    rowClassName: () => '',
    onRowClick() {},
    onRowDoubleClick() {},
    prefixCls: 'rc-table',
    bodyStyle: {},
    style: {},
    childrenColumnName: 'children',
    indentSize: 15,
    showHeader: true,
    rowRef: () => null,
    getBodyWrapper: body => body,
    emptyText: () => 'No Data',
  }

  constructor(props) {
    super(props);
    this.columnManager = new ColumnManager(props.columns, props.children);
    this.store = createStore({ currentHoverKey: null });

    this.state = {
      currentHoverKey: null,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.columns && nextProps.columns !== this.props.columns) {
      this.columnManager.reset(nextProps.columns);
    } else if (nextProps.children !== this.props.children) {
      this.columnManager.reset(null, nextProps.children);
    }
  }

  componentWillUnmount() {
    if (this.resizeEvent) {
      this.resizeEvent.remove();
    }
    if (this.debouncedSyncFixedTableRowHeight) {
      this.debouncedSyncFixedTableRowHeight.cancel();
    }
  }


  getRowKey(record, index) {
    const rowKey = this.props.rowKey;
    const key = (typeof rowKey === 'function') ?
      rowKey(record, index) : record[rowKey];
    warningOnce(
      key !== undefined,
      'Each record in table should have a unique `key` prop,' +
      'or set `rowKey` to an unique primary key.'
    );
    return key === undefined ? index : key;
  }


  getHeader(columns) {
    const { showHeader, prefixCls } = this.props;
    const rows = this.getHeaderRows(columns);

    return showHeader ? (
      <TableHeader
        prefixCls={prefixCls}
        rows={rows}
      />
    ) : null;
  }

  getHeaderRows(columns, currentRow = 0, rows) {
    rows = rows || [];
    rows[currentRow] = rows[currentRow] || [];

    columns.forEach(column => {
      if (column.rowSpan && rows.length < column.rowSpan) {
        while (rows.length < column.rowSpan) {
          rows.push([]);
        }
      }
      const cell = {
        key: column.key,
        className: column.className || '',
        children: column.title,
      };
      if (column.children) {
        this.getHeaderRows(column.children, currentRow + 1, rows);
      }
      if ('colSpan' in column) {
        cell.colSpan = column.colSpan;
      }
      if ('rowSpan' in column) {
        cell.rowSpan = column.rowSpan;
      }
      if (cell.colSpan !== 0) {
        rows[currentRow].push(cell);
      }
    });
    return rows.filter(row => row.length > 0);
  }

  getRowsByData(data, visible, indent, columns) {
    const props = this.props;
    const childrenColumnName = props.childrenColumnName;
    let rst = [];
    const rowClassName = props.rowClassName;
    const rowRef = props.rowRef;
    const needIndentSpaced = props.data.some(record => record[childrenColumnName]);
    const onRowClick = props.onRowClick;
    const onRowDoubleClick = props.onRowDoubleClick;


    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const key = this.getRowKey(record, i);
      const childrenColumn = record[childrenColumnName];
      const className = rowClassName(record, i, indent);
      const onHoverProps = {};
      const leafColumns = this.columnManager.leafColumns();

      rst.push(
        <TableRow
          indent={indent}
          indentSize={props.indentSize}
          needIndentSpaced={needIndentSpaced}
          className={className}
          record={record}
          onDestroy={this.onRowDestroy}
          index={i}
          visible={visible}
          prefixCls={`${props.prefixCls}-row`}
          childrenColumnName={childrenColumnName}
          columns={leafColumns}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          {...onHoverProps}
          key={key}
          hoverKey={key}
          ref={rowRef(record, i, indent)}
          store={this.store}
        />
      );

      this.props.afterRowCreate(rst);

      const subVisible = visible;

      if (childrenColumn) {
        rst = rst.concat(this.getRowsByData(
          childrenColumn, subVisible, indent + 1, columns
        ));
      }
    }
    return rst;
  }

  getRows(columns) {
    return this.getRowsByData(this.props.data, true, 0, columns);
  }

  getColGroup() {
    let cols = [];
    const leafColumns = this.columnManager.leafColumns();
    cols = cols.concat(leafColumns.map(c => {
      return <col key={c.key} style={{ width: c.width, minWidth: c.width }} />;
    }));
    return <colgroup>{cols}</colgroup>;
  }

  getTable(options = {}) {
    const { columns } = options;
    const { prefixCls, getBodyWrapper } = this.props;
    const bodyStyle = { ...this.props.bodyStyle };
    const tableClassName = '';

    const renderTable = () => {
      const tableStyle = {};
      const tableBody = getBodyWrapper(
        <tbody className={`${prefixCls}-tbody`}>
          {this.getRows(columns)}
        </tbody>
      );
      return (
        <table className={tableClassName} style={tableStyle}>
          {this.getColGroup(columns)}
          {this.getHeader(columns)}
          {tableBody}
        </table>
      );
    };

    let headTable;

    const bodyTable = (
      <div
        key="bodyTable"
        className={`${prefixCls}-body`}
        style={bodyStyle}
        ref="bodyTable"
        onMouseOver={this.detectScrollTarget}
        onTouchStart={this.detectScrollTarget}
      >
        {renderTable()}
      </div>
    );

    return [headTable, bodyTable];
  }

  getTitle() {
    const { title, prefixCls } = this.props;
    return title ? (
      <div className={`${prefixCls}-title`}>
        {title(this.props.data)}
      </div>
    ) : null;
  }

  getFooter() {
    const { footer, prefixCls } = this.props;
    return footer ? (
      <div className={`${prefixCls}-footer`}>
        {footer(this.props.data)}
      </div>
    ) : null;
  }

  getEmptyText() {
    const { emptyText, prefixCls, data } = this.props;
    return !data.length ? (
      <div className={`${prefixCls}-placeholder`}>
        {emptyText()}
      </div>
    ) : null;
  }

  handleRowHover = (isHover, key) => {
    this.store.setState({
      currentHoverKey: isHover ? key : null,
    });
  }

  render() {
    const props = this.props;
    const prefixCls = props.prefixCls;

    let className = props.prefixCls;
    if (props.className) {
      className += ` ${props.className}`;
    }
    className += ` ${prefixCls}-scroll-position-left`;

    return (
      <div ref={node => (this.tableNode = node)} className={className} style={props.style}>
        {this.getTitle()}
        <div className={`${prefixCls}-content`}>
          {this.getTable({ columns: this.columnManager.groupedColumns() })}
          {this.getEmptyText()}
          {this.getFooter()}
        </div>
      </div>
    );
  }
}
