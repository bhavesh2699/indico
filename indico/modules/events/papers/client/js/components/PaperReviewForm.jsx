// This file is part of Indico.
// Copyright (C) 2002 - 2019 CERN
//
// Indico is free software; you can redistribute it and/or
// modify it under the terms of the MIT License; see the
// LICENSE file for more details.

import React, {useCallback, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Form as FinalForm} from 'react-final-form';
import {Button, Form} from 'semantic-ui-react';

import {FinalDropdown, FinalSubmitButton, FinalTextArea} from 'indico/react/forms';
import {Translate} from 'indico/react/i18n';

import {addComment} from '../actions';
import {canCommentPaper, getPaperDetails, getCurrentUser, isAddingComment} from '../selectors';
import UserAvatar from './UserAvatar';

import './PaperReviewForm.module.scss';

export default function PaperReviewForm() {
  const {
    event: {id: eventId},
    contribution: {id: contributionId},
  } = useSelector(getPaperDetails);
  const user = useSelector(getCurrentUser);
  const canComment = useSelector(canCommentPaper);
  const isCommentBeingAdded = useSelector(isAddingComment);
  const dispatch = useDispatch();
  const [commentFormVisible, setCommentFormVisible] = useState(false);

  const visibilityOptions = [
    {
      value: 'judges',
      text: Translate.string('Visible only to judges'),
    },
    {
      value: 'reviewers',
      text: Translate.string('Visible to reviewers and judges'),
    },
    {
      value: 'contributors',
      text: Translate.string('Visible to contributors, reviewers and judges'),
    },
  ];

  const onCommentClickHandler = commentFormVisible
    ? null
    : () => {
        setCommentFormVisible(true);
      };

  const createComment = useCallback(
    formData => {
      dispatch(addComment(eventId, contributionId, formData));
    },
    [dispatch, eventId, contributionId]
  );

  return (
    <div className="i-timeline-item" styleName="review-timeline-input">
      <UserAvatar user={user} />
      <div className="i-timeline-item-box footer-only header-indicator-left">
        <div className="i-box-footer" style={{overflow: 'visible'}}>
          {canComment && (
            <div className="flexrow">
              <div className="f-self-stretch">
                <FinalForm
                  onSubmit={createComment}
                  initialValues={{comment: '', visibility: 'judges'}}
                >
                  {fprops => (
                    <Form
                      id="comment-form"
                      onSubmit={fprops.handleSubmit}
                      loading={isCommentBeingAdded}
                    >
                      <FinalTextArea
                        onFocus={onCommentClickHandler}
                        name="comment"
                        rows={commentFormVisible ? 3 : 1}
                        placeholder={Translate.string('Leave a comment...')}
                      />
                      {commentFormVisible && (
                        <>
                          <FinalDropdown
                            name="visibility"
                            options={visibilityOptions}
                            selection
                            required
                          />
                          <Form.Group inline>
                            <FinalSubmitButton
                              label={Translate.string('Comment')}
                              form="comment-form"
                            />
                            <Button
                              content={Translate.string('Cancel')}
                              onClick={() => setCommentFormVisible(false)}
                            />
                          </Form.Group>
                        </>
                      )}
                    </Form>
                  )}
                </FinalForm>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
