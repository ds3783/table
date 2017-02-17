import React, { PropTypes } from 'react';
import TableRow from './TableRow';

export default function expandable(Table) {
  class ExpandableTable extends React.Component {
    static propTypes = {
      expandIconAsCell: PropTypes.bool,
      defaultExpandAllRows: PropTypes.bool,
      expandedRowKeys: PropTypes.array,
      defaultExpandedRowKeys: PropTypes.array,
      expandedRowClassName: PropTypes.func,
      onExpand: PropTypes.func,
      onExpandedRowsChange: PropTypes.func,
      expandIconColumnIndex: PropTypes.number,
    }

    static defaultProps = {
      expandIconAsCell: false,
      defaultExpandAllRows: false,
      defaultExpandedRowKeys: [],
      expandedRowClassName: () => '',
      onExpand() {},
      onExpandedRowsChange() {},
      expandIconColumnIndex: 0,
    }

    constructor(props) {
      let expandedRowKeys = [];
      let rows = [...props.data];

      if (props.defaultExpandAllRows) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          expandedRowKeys.push(this.getRowKey(row, i));
          rows = rows.concat(row[props.childrenColumnName] || []);
        }
      } else {
        expandedRowKeys = props.expandedRowKeys || props.defaultExpandedRowKeys;
      }

      this.state = {
        expandedRowKeys
      }
    }

    afterRowCreate = (rows, rowKey record, index) => {
      const { expandedRowClassName, expandedRowRender } = this.props;
      const expandedRowContent = expandedRowRender(record, i, indent);
      rows.push(this.renderExpandedRow(
        key,
        expandedRowContent,
        subVisible,
        expandedRowClassName(record, i, 0)
      ));
    }

    renderExpandedRow() {
    }

    render() {
      <Table {...this.props} />
    }
  }

  return ExpandableTable;
}
