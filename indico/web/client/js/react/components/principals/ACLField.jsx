// This file is part of Indico.
// Copyright (C) 2002 - 2019 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import {Button, Dropdown, List} from 'semantic-ui-react';
import {Translate} from 'indico/react/i18n';
import {DefaultUserSearch, GroupSearch} from '../principals/Search';
import {useFetchPrincipals} from '../principals/hooks';
import {PendingPrincipalListItem, PrincipalListItem} from '../principals/items';
import {getPrincipalList, PrincipalType} from '../principals/util';

import '../principals/PrincipalListField.module.scss';
import PrincipalPermissions from './PrincipalPermissions';

function buildACL(aclMap) {
  return Object.entries(aclMap).map(([ident, permissions]) => [
    ident,
    _.sortBy(
      permissions.map(p => (p === 'fullAccess' || p === 'readAccess' ? '_' : '') + _.snakeCase(p))
    ),
  ]);
}

/**
 * The ACLField is a PrincipalField on steroids. In addition to the functionality
 * present in PrincipalField, it keeps track of user permissions.
 */
const ACLField = props => {
  const {
    value,
    disabled,
    readOnly,
    onChange,
    onFocus,
    onBlur,
    withGroups,
    eventId,
    eventRoles,
    favoriteUsersController,
    readAccessAllowed,
    fullAccessAllowed,
    permissionInfo,
    permissionManager,
  } = props;
  const [favoriteUsers, [handleAddFavorite, handleDelFavorite]] = favoriteUsersController;

  const valueIds = value.map(([identifier]) => identifier);
  const usedIdentifiers = new Set(valueIds);
  // keep track of permissions for each entry (ACL)
  const aclMap = Object.assign(
    {},
    ...value.map(([identifier, permissions]) => ({
      [identifier]: permissions.map(p => _.camelCase(p)),
    }))
  );

  const setValue = func => {
    onChange(buildACL(func(aclMap)));
    onFocus();
    onBlur();
  };

  // fetch missing principals' information
  const informationMap = useFetchPrincipals(valueIds, eventId);

  const handleDelete = identifier => {
    setValue(prev => _.omit(prev, identifier));
  };
  const handleAddItems = data => {
    const {
      permissionInfo: {default: defaultPermission},
    } = props;
    const newACLs = data.map(({identifier}) => ({[identifier]: [defaultPermission]}));
    setValue(prev => ({...prev, ...Object.assign({}, ...newACLs)}));
  };

  // Handling of list of principals (shared with PrincipalListField)
  const [entries, pendingEntries] = getPrincipalList(valueIds, informationMap);

  const roleOptions = eventRoles
    .filter(r => !usedIdentifiers.has(r.identifier))
    .map(r => ({
      value: r.identifier,
      text: r.name,
    }));

  return (
    <>
      <List divided relaxed styleName="list">
        {entries.map(data => {
          const permissions = aclMap[data.identifier];
          const permissionList = permissionManager && (
            <PrincipalPermissions
              permissions={permissions}
              permissionInfo={permissionInfo}
              onAddPermission={permId => {
                setValue(prev =>
                  permissionManager.setPermissionForId(prev, data.identifier, permId, true)
                );
              }}
              onRemovePermission={permId => {
                setValue(prev =>
                  permissionManager.setPermissionForId(prev, data.identifier, permId, false)
                );
              }}
              readAccessAllowed={readAccessAllowed}
              fullAccessAllowed={fullAccessAllowed}
              readOnly={readOnly}
            />
          );
          return (
            <PrincipalListItem
              key={data.identifier}
              name={data.name}
              detail={data.detail}
              meta={data.meta}
              type={data.type}
              invalid={data.invalid}
              favorite={data.type === PrincipalType.user && data.userId in favoriteUsers}
              onDelete={() => !disabled && handleDelete(data.identifier)}
              onAddFavorite={() => !disabled && handleAddFavorite(data.userId)}
              onDelFavorite={() => !disabled && handleDelFavorite(data.userId)}
              disabled={disabled}
              readOnly={readOnly}
              actions={permissionList}
            />
          );
        })}
        {pendingEntries.map(data => (
          <PendingPrincipalListItem key={data.identifier} type={data.type} />
        ))}
        {!value.length && (
          <List.Item styleName="empty">
            <Translate>This list is currently empty</Translate>
          </List.Item>
        )}
      </List>
      {!readOnly && (
        <Button.Group>
          <Button icon="add" as="div" disabled />
          <DefaultUserSearch
            existing={valueIds}
            onAddItems={handleAddItems}
            favorites={favoriteUsers}
            disabled={disabled}
          />
          {withGroups && (
            <GroupSearch existing={valueIds} onAddItems={handleAddItems} disabled={disabled} />
          )}
          {eventRoles.length !== 0 && (
            <Dropdown
              text={Translate.string('Role')}
              button
              upward
              floating
              disabled={roleOptions.length === 0}
              options={roleOptions}
              value={null}
              openOnFocus={false}
              selectOnBlur={false}
              selectOnNavigation={false}
              onChange={(e, data) => handleAddItems([{identifier: data.value}])}
            />
          )}
        </Button.Group>
      )}
    </>
  );
};

ACLField.propTypes = {
  /** Current value of the field, an array of `[identifier, [permissions]]` pairs */
  value: PropTypes.arrayOf(PropTypes.array).isRequired,
  /** Whether the field is disabled */
  disabled: PropTypes.bool.isRequired,
  /** Whether the field is read-only */
  readOnly: PropTypes.bool,
  /** Called when the field's value changes */
  onChange: PropTypes.func.isRequired,
  /** Called when the field is selected */
  onFocus: PropTypes.func.isRequired,
  /** Called when the field is deselected */
  onBlur: PropTypes.func.isRequired,
  /** Array of the form `[favoriteUsers, [handleAddFavorite, handleDelFavorite]]` */
  favoriteUsersController: PropTypes.array.isRequired,
  /** Whether groups are allowed in this ACL */
  withGroups: PropTypes.bool,
  /** Whether the 'read_access' permission is used/allowed */
  readAccessAllowed: PropTypes.bool,
  /** Whether the 'full_access' permission is used/allowed */
  fullAccessAllowed: PropTypes.bool,
  /** The ID of the event used in case of event-scoped principals */
  eventId: PropTypes.number,
  /** The event roles that are available for the specified eventId */
  eventRoles: PropTypes.array,
  /** Object containing metadata about available permissions */
  permissionInfo: PropTypes.shape({
    permissions: PropTypes.object,
    tree: PropTypes.object,
    default: PropTypes.string,
  }).isRequired,
  permissionManager: PropTypes.shape({
    setPermissionForId: PropTypes.func.isRequired,
  }).isRequired,
};

ACLField.defaultProps = {
  withGroups: false,
  readOnly: false,
  readAccessAllowed: true,
  fullAccessAllowed: true,
  eventId: null,
  eventRoles: [],
};

export default React.memo(ACLField);
