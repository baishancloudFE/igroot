import * as React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import List, { TransferListProps } from './list';
import Operation from './operation';
import Search from './search';
import LocaleReceiver from '../locale-provider/LocaleReceiver';
import defaultLocale from '../locale-provider/default';

export { TransferListProps } from './list';
export { TransferOperationProps } from './operation';
export { TransferSearchProps } from './search';

function noop() {
}

export type TransferDirection = 'left' | 'right' | 'up' | 'down';

export interface TransferItem {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
}

export interface TransferProps {
  prefixCls?: string;
  className?: string;
  dataSource: TransferItem[];
  targetKeys?: string[];
  selectedKeys?: string[];
  render?: (record: TransferItem) => React.ReactNode;
  onChange?: (targetKeys: string[], direction: string, moveKeys: any) => void;
  onSelectChange?: (sourceSelectedKeys: string[], targetSelectedKeys: string[]) => void;
  onSort?: (dataSources: TransferItem[]) => void;
  style?: React.CSSProperties;
  listStyle?: React.CSSProperties;
  titles?: string[];
  operations?: string[];
  showSearch?: boolean;
  filterOption?: (inputValue: any, item: any) => boolean;
  searchPlaceholder?: string;
  notFoundContent?: React.ReactNode;
  footer?: (props: TransferListProps) => React.ReactNode;
  body?: (props: TransferListProps) => React.ReactNode;
  rowKey?: (record: TransferItem) => string;
  onSearchChange?: (direction: TransferDirection, e: React.ChangeEvent<HTMLInputElement>) => void;
  lazy?: {} | boolean;
  onScroll?: (direction: TransferDirection, e: React.SyntheticEvent<HTMLDivElement>) => void;
}

export interface TransferLocale {
  titles: string[];
  notFoundContent: string;
  searchPlaceholder: string;
  itemUnit: string;
  itemsUnit: string;
}

export default class Transfer extends React.Component<TransferProps, any> {
  // For high-level customized Transfer @dqaria
  static List = List;
  static Operation = Operation;
  static Search = Search;

  static defaultProps = {
    dataSource: [],
    render: noop,
    showSearch: false,
  };

  static propTypes = {
    prefixCls: PropTypes.string,
    dataSource: PropTypes.array,
    render: PropTypes.func,
    targetKeys: PropTypes.array,
    onChange: PropTypes.func,
    height: PropTypes.number,
    listStyle: PropTypes.object,
    className: PropTypes.string,
    titles: PropTypes.array,
    operations: PropTypes.array,
    showSearch: PropTypes.bool,
    filterOption: PropTypes.func,
    searchPlaceholder: PropTypes.string,
    notFoundContent: PropTypes.node,
    body: PropTypes.func,
    footer: PropTypes.func,
    rowKey: PropTypes.func,
    lazy: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
  };

  splitedDataSource: {
    leftDataSource: TransferItem[],
    rightDataSource: TransferItem[],
  } | null;

  constructor(props: TransferProps) {
    super(props);

    const { selectedKeys = [], targetKeys = [] } = props;
    this.state = {
      leftFilter: '',
      rightFilter: '',
      startKey: '',
      sourceSelectedKeys: selectedKeys.filter(key => targetKeys.indexOf(key) === -1),
      targetSelectedKeys: selectedKeys.filter(key => targetKeys.indexOf(key) > -1),
    };
  }

  componentWillReceiveProps(nextProps: TransferProps) {
    const { sourceSelectedKeys, targetSelectedKeys } = this.state;

    if (nextProps.targetKeys !== this.props.targetKeys ||
      nextProps.dataSource !== this.props.dataSource) {
      // clear cached splited dataSource
      this.splitedDataSource = null;

      if (!nextProps.selectedKeys) {
        // clear key nolonger existed
        // clear checkedKeys according to targetKeys
        const { dataSource, targetKeys = [] } = nextProps;

        const newSourceSelectedKeys: String[] = [];
        const newTargetSelectedKeys: String[] = [];
        dataSource.forEach(({ key }) => {
          if (sourceSelectedKeys.includes(key) && !targetKeys.includes(key)) {
            newSourceSelectedKeys.push(key);
          }
          if (targetSelectedKeys.includes(key) && targetKeys.includes(key)) {
            newTargetSelectedKeys.push(key);
          }
        });
        this.setState({
          sourceSelectedKeys: newSourceSelectedKeys,
          targetSelectedKeys: newTargetSelectedKeys,
        });
      }
    }

    if (nextProps.selectedKeys) {
      const targetKeys = nextProps.targetKeys || [];
      this.setState({
        sourceSelectedKeys: nextProps.selectedKeys.filter(key => !targetKeys.includes(key)),
        targetSelectedKeys: nextProps.selectedKeys.filter(key => targetKeys.includes(key)),
      });
    }
  }

  splitDataSource(props: TransferProps) {
    if (this.splitedDataSource) {
      return this.splitedDataSource;
    }

    const { dataSource, rowKey, targetKeys = [] } = props;

    const leftDataSource: TransferItem[] = [];
    const rightDataSource: TransferItem[] = new Array(targetKeys.length);
    dataSource.forEach(record => {
      if (rowKey) {
        record.key = rowKey(record);
      }

      // rightDataSource should be ordered by targetKeys
      // leftDataSource should be ordered by dataSource
      const indexOfKey = targetKeys.indexOf(record.key);
      if (indexOfKey !== -1) {
        rightDataSource[indexOfKey] = record;
      } else {
        leftDataSource.push(record);
      }
    });

    this.splitedDataSource = {
      leftDataSource,
      rightDataSource,
    };

    return this.splitedDataSource;
  }

  moveTo = (direction: TransferDirection) => {
    const { targetKeys = [], dataSource = [], onChange } = this.props;
    const { sourceSelectedKeys, targetSelectedKeys } = this.state;
    const moveKeys = direction === 'right' ? sourceSelectedKeys : targetSelectedKeys;
    // filter the disabled options
    const newMoveKeys = moveKeys.filter((key: string) =>
      !dataSource.some(data => !!(key === data.key && data.disabled)),
    );
    // move items to target box
    const newTargetKeys = direction === 'right'
      ? newMoveKeys.concat(targetKeys)
      : targetKeys.filter(targetKey => newMoveKeys.indexOf(targetKey) === -1);

    // empty checked keys
    const oppositeDirection = direction === 'right' ? 'left' : 'right';
    this.setState({
      [this.getSelectedKeysName(oppositeDirection)]: [],
    });
    this.handleSelectChange(oppositeDirection, []);

    if (onChange) {
      onChange(newTargetKeys, direction, newMoveKeys);
    }
  }

  // 针对数据位置移动~
  moveSort = (direction: TransferDirection) => {
    const { onSort } = this.props;
    if (!onSort) return

    const { sourceSelectedKeys } = this.state;
    const dataSource = [...this.props.dataSource];
    console.log(dataSource.map(item => item.key), sourceSelectedKeys)
    const itemIndex = dataSource.findIndex(data => data.key === sourceSelectedKeys[0]);
    const elem = dataSource.splice(itemIndex, 1);
    // console.log(elem,'ele')
    if (direction === 'down')
      dataSource.splice(itemIndex + 1, 0, elem[0]);

    else
      dataSource.splice(itemIndex - 1, 0, elem[0]);
    console.log(dataSource.map(item => item.key), 'result')
    onSort(dataSource);
  }

  moveToLeft = () => this.moveTo('left');
  moveToRight = () => this.moveTo('right');
  moveUp = () => this.moveSort('up');
  moveDown = () => this.moveSort('down');

  handleDoubleClick = (listType: string, itemKey: any) => {
    const move = listType === 'source' ? this.moveToRight : this.moveToLeft

    this.setState({ [`${listType}SelectedKeys`]: [itemKey] }, move)
  }

  handleDownItem = (startKey: any) => this.setState({ startKey })
  handleHoverSelect = (listType: string, itemKey: any) => {
    const { leftDataSource, rightDataSource } = this.splitDataSource(this.props)
    const dataSource = listType === 'source' ? leftDataSource : rightDataSource
    const key = `${listType}SelectedKeys`
    const finalValueIndex = dataSource.findIndex(data => data.key === this.state.startKey)
    const itemIndex = dataSource.findIndex(data => data.key === itemKey)

    const { min, max } = ((a, b) => {
      if (a > b)
        return { min: b, max: a }

      else
        return { min: a, max: b }
    })(finalValueIndex, itemIndex)

    const obj = {}
    const keys = Array.prototype
      .concat(this.state[key], dataSource.slice(min, max + 1).map(data => data.key))
      .filter(key => {
        if (!obj[key] && key != undefined) {
          obj[key] = true
          return true
        }

        return false
      })

    this.setState({ [key]: keys })
  }

  handleShiftClick = (listType: string, itemKey: any) => {
    const { leftDataSource, rightDataSource } = this.splitDataSource(this.props)
    const dataSource = listType === 'source' ? leftDataSource : rightDataSource
    const key = `${listType}SelectedKeys`
    const stateKeys = this.state[key]
    const finalValueIndex = dataSource.findIndex(data => data.key === stateKeys[stateKeys.length - 1])
    const itemIndex = dataSource.findIndex(data => data.key === itemKey)

    const { min, max } = ((a, b) => {
      if (a > b)
        return { min: b, max: a }

      else
        return { min: a, max: b }
    })(finalValueIndex, itemIndex)

    const obj = {}
    const keys = Array.prototype
      .concat(stateKeys, dataSource.slice(min, max + 1).map(data => data.key))
      .filter(key => {
        if (!obj[key] && key != undefined) {
          obj[key] = true
          return true
        }

        return false
      })

    this.setState({ [key]: keys })
  }

  handleSelectChange(direction: TransferDirection, holder: string[]) {
    const { sourceSelectedKeys, targetSelectedKeys } = this.state;
    const onSelectChange = this.props.onSelectChange;
    if (!onSelectChange) {
      return;
    }

    if (direction === 'left') {
      onSelectChange(holder, targetSelectedKeys);
    } else {
      onSelectChange(sourceSelectedKeys, holder);
    }
  }

  handleSelectAll = (direction: TransferDirection, filteredDataSource: TransferItem[], checkAll: boolean) => {
    const originalSelectedKeys = this.state[this.getSelectedKeysName(direction)] || [];
    const currentKeys = filteredDataSource.map(item => item.key);
    // Only operate current keys from original selected keys
    const newKeys1 = originalSelectedKeys.filter((key: string) => currentKeys.indexOf(key) === -1);
    const newKeys2 = [...originalSelectedKeys];
    currentKeys.forEach((key) => {
      if (newKeys2.indexOf(key) === -1) {
        newKeys2.push(key);
      }
    });
    const holder = checkAll ? newKeys1 : newKeys2;
    this.handleSelectChange(direction, holder);

    if (!this.props.selectedKeys) {
      this.setState({
        [this.getSelectedKeysName(direction)]: holder,
      });
    }
  }

  handleLeftSelectAll = (filteredDataSource: TransferItem[], checkAll: boolean) => (
    this.handleSelectAll('left', filteredDataSource, checkAll)
  )
  handleRightSelectAll = (filteredDataSource: TransferItem[], checkAll: boolean) => (
    this.handleSelectAll('right', filteredDataSource, checkAll)
  )

  handleFilter = (direction: TransferDirection, e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      // add filter
      [`${direction}Filter`]: e.target.value,
    });
    if (this.props.onSearchChange) {
      this.props.onSearchChange(direction, e);
    }
  }

  handleLeftFilter = (e: React.ChangeEvent<HTMLInputElement>) => this.handleFilter('left', e);
  handleRightFilter = (e: React.ChangeEvent<HTMLInputElement>) => this.handleFilter('right', e);

  handleClear = (direction: string) => {
    this.setState({
      [`${direction}Filter`]: '',
    });
  }

  handleLeftClear = () => this.handleClear('left');
  handleRightClear = () => this.handleClear('right');

  handleSelect = (direction: TransferDirection, selectedItem: TransferItem, checked: boolean) => {
    const { sourceSelectedKeys, targetSelectedKeys } = this.state;
    const holder = direction === 'left' ? [...sourceSelectedKeys] : [...targetSelectedKeys];
    const index = holder.indexOf(selectedItem.key);
    if (index > -1) {
      holder.splice(index, 1);
    }
    if (checked) {
      holder.push(selectedItem.key);
    }
    this.handleSelectChange(direction, holder);

    if (!this.props.selectedKeys) {
      this.setState({
        [this.getSelectedKeysName(direction)]: holder,
      });
    }
  }

  handleLeftSelect = (selectedItem: TransferItem, checked: boolean) => {
    return this.handleSelect('left', selectedItem, checked);
  }

  handleRightSelect = (selectedItem: TransferItem, checked: boolean) => {
    return this.handleSelect('right', selectedItem, checked);
  }

  handleUpSelect = (selectedItem: TransferItem, checked: boolean) => {
    return this.handleSelect('up', selectedItem, checked)
  }

  handleDownSelect = (selectedItem: TransferItem, checked: boolean) => {
    return this.handleSelect('down', selectedItem, checked)
  }

  handleScroll = (direction: TransferDirection, e: React.SyntheticEvent<HTMLDivElement>) => {
    const { onScroll } = this.props;
    if (onScroll) {
      onScroll(direction, e);
    }
  }

  handleLeftScroll = (e: React.SyntheticEvent<HTMLDivElement>) => this.handleScroll('left', e);
  handleRightScroll = (e: React.SyntheticEvent<HTMLDivElement>) => this.handleScroll('right', e);

  getTitles(transferLocale: TransferLocale): string[] {
    const { props } = this;
    if (props.titles) {
      return props.titles;
    }
    return transferLocale.titles;
  }

  getSelectedKeysName(direction: TransferDirection) {
    return direction === 'left' ? 'sourceSelectedKeys' : 'targetSelectedKeys';
  }

  renderTransfer = (locale: TransferLocale) => {
    const {
      prefixCls = 'ant-transfer',
      className,
      operations = [],
      showSearch,
      notFoundContent,
      searchPlaceholder,
      body,
      footer,
      listStyle,
      filterOption,
      render,
      lazy,
      onSort,
    } = this.props;
    const { leftFilter, rightFilter, sourceSelectedKeys, targetSelectedKeys } = this.state;

    const { leftDataSource, rightDataSource } = this.splitDataSource(this.props);
    const leftActive = targetSelectedKeys.length > 0;
    const rightActive = sourceSelectedKeys.length > 0;
    const upActive = !!onSort && sourceSelectedKeys.length === 1
    const downActive = !!onSort && sourceSelectedKeys.length === 1

    const cls = classNames(className, prefixCls);

    const titles = this.getTitles(locale);
    return (
      <div className={cls}>
        <List
          prefixCls={`${prefixCls}-list`}
          titleText={titles[0]}
          dataSource={leftDataSource}
          filter={leftFilter}
          filterOption={filterOption}
          style={listStyle}
          checkedKeys={sourceSelectedKeys}
          handleShiftClick={itemKey => this.handleShiftClick('source', itemKey)}
          handleDownItem={this.handleDownItem}
          handleDoubleClick={itemKey => this.handleDoubleClick('source', itemKey)}
          handleHoverSelect={itemKey => this.handleHoverSelect('source', itemKey)}
          handleFilter={this.handleLeftFilter}
          handleClear={this.handleLeftClear}
          handleSelect={this.handleLeftSelect}
          handleSelectAll={this.handleLeftSelectAll}
          render={render}
          showSearch={showSearch}
          searchPlaceholder={searchPlaceholder || locale.searchPlaceholder}
          notFoundContent={notFoundContent || locale.notFoundContent}
          itemUnit={locale.itemUnit}
          itemsUnit={locale.itemsUnit}
          body={body}
          footer={footer}
          lazy={lazy}
          onScroll={this.handleLeftScroll}
        />
        <Operation
          className={`${prefixCls}-operation`}
          rightActive={rightActive}
          rightArrowText={operations[0]}
          moveToRight={this.moveToRight}
          leftActive={leftActive}
          leftArrowText={operations[1]}
          moveToLeft={this.moveToLeft}
          moveUp={this.moveUp}
          upActive={upActive}
          moveDown={this.moveDown}
          downActive={downActive}
        />
        <List
          prefixCls={`${prefixCls}-list`}
          titleText={titles[1]}
          dataSource={rightDataSource}
          filter={rightFilter}
          filterOption={filterOption}
          style={listStyle}
          checkedKeys={targetSelectedKeys}
          handleDownItem={this.handleDownItem}
          handleShiftClick={itemKey => this.handleShiftClick('target', itemKey)}
          handleDoubleClick={itemKey => this.handleDoubleClick('target', itemKey)}
          handleHoverSelect={itemKey => this.handleHoverSelect('target', itemKey)}
          handleFilter={this.handleRightFilter}
          handleClear={this.handleRightClear}
          handleSelect={this.handleRightSelect}
          handleSelectAll={this.handleRightSelectAll}
          render={render}
          showSearch={showSearch}
          searchPlaceholder={searchPlaceholder || locale.searchPlaceholder}
          notFoundContent={notFoundContent || locale.notFoundContent}
          itemUnit={locale.itemUnit}
          itemsUnit={locale.itemsUnit}
          body={body}
          footer={footer}
          lazy={lazy}
          onScroll={this.handleRightScroll}
        />
      </div>
    );
  }

  render() {
    return (
      <LocaleReceiver
        componentName="Transfer"
        defaultLocale={defaultLocale.Transfer}
      >
        {this.renderTransfer}
      </LocaleReceiver>
    );
  }
}
