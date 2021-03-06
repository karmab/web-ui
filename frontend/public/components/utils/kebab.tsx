/* eslint-disable no-undef */

import * as _ from 'lodash-es';
import * as React from 'react';
import { Tooltip } from './tooltip';

import { annotationsModal, configureReplicaCountModal, labelsModal, podSelectorModal, deleteModal } from '../modals';
import { DropdownMixin } from './dropdown';
import { history, resourceObjPath } from './index';
import { referenceForModel, K8sResourceKind, K8sResourceKindReference, K8sKind } from '../../module/k8s';
import { connectToModel } from '../../kinds';
import {FirehoseResource} from '../factory';
import { Firehose } from './firehose';

const KebabItems: React.SFC<KebabItemsProps> = ({options, onClick}) => {
  const visibleOptions = _.reject(options, o => _.get(o, 'hidden', false));
  const lis = _.map(visibleOptions, (o, i) => <li key={i}><a href="#" onClick={e => onClick(e, o)}>{o.label}</a></li>);
  return <ul className="dropdown-menu dropdown-menu-right dropdown-menu--block co-kebab__dropdown">
    {lis}
  </ul>;
};

const kebabFactory: KebabFactory = {
  Delete: (kind, obj) => ({
    label: `Delete ${kind.label}`,
    callback: () => deleteModal({
      kind,
      resource: obj,
    }),
  }),
  Edit: (kind, obj) => ({
    label: `Edit ${kind.label}`,
    href: `${resourceObjPath(obj, kind.crd ? referenceForModel(kind) : kind.kind)}/yaml`,
  }),
  ModifyLabels: (kind, obj) => ({
    label: 'Edit Labels',
    callback: () => labelsModal({
      kind,
      resource: obj,
    }),
  }),
  ModifyPodSelector: (kind, obj) => ({
    label: 'Edit Pod Selector',
    callback: () => podSelectorModal({
      kind,
      resource:  obj,
    }),
  }),
  ModifyAnnotations: (kind, obj) => ({
    label: 'Edit Annotations',
    callback: () => annotationsModal({
      kind,
      resource: obj,
    }),
  }),
  ModifyCount: (kind, obj) => ({
    label: 'Edit Count',
    callback: () => configureReplicaCountModal({
      resourceKind: kind,
      resource: obj,
    }),
  }),
  EditEnvironment: (kind, obj) => ({
    label: `${kind.kind === 'Pod' ? 'View' : 'Edit'} Environment`,
    href: `${resourceObjPath(obj, kind.crd ? referenceForModel(kind) : kind.kind)}/environment`,
  }),
  AddStorage: (kind, obj) => ({
    label: 'Add Storage',
    href: `${resourceObjPath(obj, kind.crd ? referenceForModel(kind) : kind.kind)}/attach-storage`,
  }),
};

// The common menu actions that most resource share
kebabFactory.common = [kebabFactory.ModifyLabels, kebabFactory.ModifyAnnotations, kebabFactory.Edit, kebabFactory.Delete];

export const ResourceKebab = connectToModel((props: ResourceKebabProps) => {
  const {actions, kindObj, resource, isDisabled} = props;
  const resources = props.resources || [];

  if (!kindObj) {
    return null;
  }

  const resourceKeys = _.map(resources, 'prop');

  const Wrapper = (wrapperProps) => {
    const extraResources = _.reduce(resourceKeys, (extraObjs, key) => ({...extraObjs, [key]: wrapperProps[key].data}), {});
    return <Kebab
      options={actions.map(a => a(kindObj, resource, extraResources))}
      key={resource.metadata.uid}
      isDisabled={isDisabled !== undefined ? isDisabled : _.get(resource.metadata, 'deletionTimestamp')}
      id={`kebab-for-${resource.metadata.uid}`}
    />;
  };

  return (
    <Firehose resources={resources}>
      <Wrapper />
    </Firehose>
  );
});

export class Kebab extends DropdownMixin {
  static factory: KebabFactory = kebabFactory;
  private onClick = this.onClick_.bind(this);

  onClick_(event, option) {
    event.preventDefault();

    if (option.callback) {
      option.callback();
    }

    if (option.href) {
      history.push(option.href);
    }

    this.hide();
  }

  render() {
    const {options, isDisabled, id} = this.props;

    return <div id={id}>
      { isDisabled ?
        <Tooltip content="disabled">
          <div ref={this.dropdownElement} className="co-kebab co-kebab--disabled" >
            <span className="fa fa-ellipsis-v co-kebab__icon co-kebab__icon--disabled" aria-hidden="true"></span>
            <span className="sr-only">Actions</span>
          </div>
        </Tooltip> :
        <div ref={this.dropdownElement} className="co-kebab" >
          <button type="button" aria-label="Actions" aria-haspopup="true" className="btn btn-link co-kebab__button" onClick={this.toggle}>
            <span className="fa fa-ellipsis-v co-kebab__icon" aria-hidden="true"></span>
          </button>
          <span className="sr-only">Actions</span>
          { this.state.active && <KebabItems options={options} onClick={this.onClick} /> }
        </div>
      }
    </div>;
  }
}

export type KebabOption = {
  label: string;
  href?: string, callback?: () => any;
};
export type KebabAction = (kind, obj: K8sResourceKind, object?) => KebabOption;

export type ResourceKebabProps = {
  kindObj: K8sKind;
  actions: KebabAction[];
  kind: K8sResourceKindReference;
  resource: K8sResourceKind;
  isDisabled?: boolean;
  resources?: FirehoseResource[];
};

export type KebabItemsProps = {
  options: KebabOption[];
  onClick: (event: React.MouseEvent<{}>, option: KebabOption) => void;
};

export type KebabFactory = {[name: string]: KebabAction} & {common?: KebabAction[]};

KebabItems.displayName = 'KebabItems';
ResourceKebab.displayName = 'ResourceKebab';
