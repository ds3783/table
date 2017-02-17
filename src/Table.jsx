import React, { PropTypes } from 'react';
import TableRow from './TableRow';
import TableHeader from './TableHeader';
import { measureScrollbar, warningOnce } from './utils';
import ColumnManager from './ColumnManager';
import createStore from './createStore';
import classes from 'component-classes';

export default class Table extends React.Component {
  static propTypes = {
    data: PropTypes.array,
    useFixedHeader: PropTypes.bool,
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
    scroll: PropTypes.object,
    rowRef: PropTypes.func,
    getBodyWrapper: PropTypes.func,
    children: PropTypes.node,
  }

  static defaultProps = {
    data: [],
    useFixedHeader: false,
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
    scroll: {},
    rowRef: () => null,
    getBodyWrapper: body => body,
    emptyText: () => 'No Data',
  }

  constructor(props) {
    super(props);
    this.columnManager = new ColumnManager(props.columns, props.children);
    this.store = createStore({ currentHoverKey: null });
    this.setScrollPosition('left');

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

  componentDidUpdate(prevProps) {
    // when table changes to empty, reset scrollLeft
    if (prevProps.data.length > 0 && this.props.data.length === 0 && this.hasScrollX()) {
      this.resetScrollX();
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
    const { prefixCls, scroll = {}, getBodyWrapper } = this.props;
    let { useFixedHeader } = this.props;
    const bodyStyle = { ...this.props.bodyStyle };
    const headStyle = {};

    let tableClassName = '';
    if (scroll.x) {
      tableClassName = `${prefixCls}-fixed`;
    }
    if (scroll.x) {
      bodyStyle.overflowX = bodyStyle.overflowX || 'auto';
    }

    if (scroll.y) {
      // maxHeight will make fixed-Table scrolling not working
      // so we only set maxHeight to body-Table here
      bodyStyle.maxHeight = bodyStyle.maxHeight || scroll.y;
      bodyStyle.overflowY = bodyStyle.overflowY || 'scroll';
      useFixedHeader = true;

      // Add negative margin bottom for scroll bar overflow bug
      const scrollbarWidth = measureScrollbar();
      if (scrollbarWidth > 0) {
        headStyle.marginBottom = `-${scrollbarWidth}px`;
        headStyle.paddingBottom = '0px';
      }
    }

    const renderTable = (hasHead = true, hasBody = true) => {
      const tableStyle = {};
      if (scroll.x) {
        // not set width, then use content fixed width
        if (scroll.x === true) {
          tableStyle.tableLayout = 'fixed';
        } else {
          tableStyle.width = scroll.x;
        }
      }
      const tableBody = hasBody ? getBodyWrapper(
        <tbody className={`${prefixCls}-tbody`}>
          {this.getRows(columns)}
        </tbody>
      ) : null;
      return (
        <table className={tableClassName} style={tableStyle}>
          {this.getColGroup(columns)}
          {hasHead ? this.getHeader(columns) : null}
          {tableBody}
        </table>
      );
    };

    let headTable;

    if (useFixedHeader) {
      headTable = (
        <div
          key="headTable"
          className={`${prefixCls}-header`}
          style={headStyle}
          onMouseOver={this.detectScrollTarget}
          onTouchStart={this.detectScrollTarget}
          onScroll={this.handleBodyScroll}
        >
          {renderTable(true, false)}
        </div>
      );
    }

    const bodyTable = (
      <div
        key="bodyTable"
        className={`${prefixCls}-body`}
        style={bodyStyle}
        ref="bodyTable"
        onMouseOver={this.detectScrollTarget}
        onTouchStart={this.detectScrollTarget}
        onScroll={this.handleBodyScroll}
      >
        {renderTable(!useFixedHeader)}
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

  setScrollPosition(position) {
    this.scrollPosition = position;
    if (this.tableNode) {
      const { prefixCls } = this.props;
      classes(this.tableNode)
        .remove(new RegExp(`^${prefixCls}-scroll-position-.+$`))
        .add(`${prefixCls}-scroll-position-${position}`);
    }
  }

  resetScrollX() {
    if (this.refs.headTable) {
      this.refs.headTable.scrollLeft = 0;
    }
    if (this.refs.bodyTable) {
      this.refs.bodyTable.scrollLeft = 0;
    }
  }

  detectScrollTarget = (e) => {
    if (this.scrollTarget !== e.currentTarget) {
      this.scrollTarget = e.currentTarget;
    }
  }

  hasScrollX() {
    const { scroll = {} } = this.props;
    return 'x' in scroll;
  }

  handleBodyScroll = (e) => {
    // Prevent scrollTop setter trigger onScroll event
    // http://stackoverflow.com/q/1386696
    if (e.target !== this.scrollTarget) {
      return;
    }
    const { scroll = {} } = this.props;
    const { headTable, bodyTable } = this.refs;
    if (scroll.x && e.target.scrollLeft !== this.lastScrollLeft) {
      if (e.target === bodyTable && headTable) {
        headTable.scrollLeft = e.target.scrollLeft;
      } else if (e.target === headTable && bodyTable) {
        bodyTable.scrollLeft = e.target.scrollLeft;
      }
      if (e.target.scrollLeft === 0) {
        this.setScrollPosition('left');
      } else if (e.target.scrollLeft + 1 >=
        e.target.children[0].getBoundingClientRect().width -
        e.target.getBoundingClientRect().width) {
        this.setScrollPosition('right');
      } else if (this.scrollPosition !== 'middle') {
        this.setScrollPosition('middle');
      }
    }
    if (scroll.y) {
      if (bodyTable && e.target !== bodyTable) {
        bodyTable.scrollTop = e.target.scrollTop;
      }
    }
    // Remember last scrollLeft for scroll direction detecting.
    this.lastScrollLeft = e.target.scrollLeft;
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
    if (props.useFixedHeader || (props.scroll && props.scroll.y)) {
      className += ` ${prefixCls}-fixed-header`;
    }
    className += ` ${prefixCls}-scroll-position-${this.scrollPosition}`;

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
