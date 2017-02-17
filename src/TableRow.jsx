import React, { PropTypes } from 'react';
import TableCell from './TableCell';

export default class TableRow extends React.Component {
  static propTypes = {
    onDestroy: PropTypes.func,
    onRowClick: PropTypes.func,
    onRowDoubleClick: PropTypes.func,
    record: PropTypes.object,
    prefixCls: PropTypes.string,
    onHover: PropTypes.func,
    columns: PropTypes.array,
    height: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    visible: PropTypes.bool,
    index: PropTypes.number,
    hoverKey: PropTypes.any,
    className: PropTypes.string,
    indent: PropTypes.number,
    indentSize: PropTypes.number,
    store: PropTypes.object.isRequired,
  }

  static defaultProps = {
    onRowClick() {},
    onRowDoubleClick() {},
    onDestroy() {},
    onHover() {},
  }

  state = {
    hovered: false,
  }

  componentDidMount() {
    const { store, hoverKey } = this.props;
    this.unsubscribe = store.subscribe(() => {
      if (store.getState().currentHoverKey === hoverKey) {
        this.setState({ hovered: true });
      } else if (this.state.hovered === true) {
        this.setState({ hovered: false });
      }
    });
  }

  componentWillUnmount() {
    const { record, onDestroy, index } = this.props;
    onDestroy(record, index);
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  onRowClick = (event) => {
    const {
      record,
      index,
      onRowClick,
    } = this.props;
    onRowClick(record, index, event);
  }

  onRowDoubleClick = (event) => {
    const { record, index, onRowDoubleClick } = this.props;
    onRowDoubleClick(record, index, event);
  }

  onMouseEnter = () => {
    const { onHover, hoverKey } = this.props;
    onHover(true, hoverKey);
  }

  onMouseLeave = () => {
    const { onHover, hoverKey } = this.props;
    onHover(false, hoverKey);
  }

  render() {
    const {
      prefixCls, columns, record, height, visible, index, indent, indentSize,
    } = this.props;

    let { className } = this.props;

    if (this.state.hovered) {
      className += ` ${prefixCls}-hover`;
    }

    const cells = [];

    for (let i = 0; i < columns.length; i++) {
      cells.push(
        <TableCell
          prefixCls={prefixCls}
          record={record}
          indentSize={indentSize}
          indent={indent}
          index={index}
          column={columns[i]}
          key={columns[i].key}
        />
      );
    }
    const style = { height };
    if (!visible) {
      style.display = 'none';
    }

    return (
      <tr
        onClick={this.onRowClick}
        onDoubleClick={this.onRowDoubleClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        className={`${prefixCls} ${className} ${prefixCls}-level-${indent}`}
        style={style}
      >
        {cells}
      </tr>
    );
  }
}
