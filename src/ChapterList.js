import React, { Component } from 'react';
import { formatTime, padWithZero } from './utils';
import './ChapterList.css';

class ChapterList extends Component {
  state = {
    metadata: [],
  };

  constructor(props) {
    super(props);

    this.state = {
      metadata: props.metadata,
    };
  }

  componentWillReceiveProps(props) {
    const metadata = props.metadata;
    this.setState({ metadata });
  }

  chaptersList(metadata = []) {
    const nodes = [];

    if (!metadata) {
      return null;
    }

    metadata.forEach((title, titleId) => {
      if (!title || !title.forceKeyFrames) {
        return;
      }

      const length = title.forceKeyFrames.length;
      const digitsNumber = Math.log(length) * Math.LOG10E + 1 | 0;
      const titleNode = (
        <h2 key={`title-${titleId}`}>{`Title ${titleId}`}</h2>
      );
      const chapterNodes = (
        <ul key={`chapters-${titleId}`}>
          {title.forceKeyFrames.map((startTime, chapterId) => {
            if (chapterId === title.forceKeyFrames.length - 1) {
              return null;
            }

            const duration = formatTime(title.forceKeyFrames[chapterId + 1] - title.forceKeyFrames[chapterId]);

            return (
              <li key={chapterId}>
                <span>{`Chapter ${padWithZero((chapterId + 1), digitsNumber)}`}</span>
                <span className="duration">{` ${duration}`}</span>
              </li>
            );
          })}
        </ul>
      );

      nodes.push(titleNode);
      nodes.push(chapterNodes);
    });

    return nodes;
  }

  render() {
    if (!this.state.metadata) {
      return null;
    }

    const titleNodes = this.chaptersList(this.state.metadata);

    if (!titleNodes) {
      return null;
    }

    return (
      <div className="ChapterList">{titleNodes}</div>
    );
  }
}

export default ChapterList;
