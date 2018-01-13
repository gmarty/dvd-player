import React, { Component } from 'react';
import config from './config';
import Vm from './lib/vm';
import './Play.css';
import Video from './Video';
import ChapterList from './ChapterList';

class Play extends Component {
  state = {
    metadata: [],
  };
  dvd = '';
  video = null;
  vm = null;

  constructor(props) {
    super(props);

    this.dvd = props && props.match && props.match.params
      && props.match.params.dvd;
  }

  componentDidMount() {
    const host = this.props.host || config.host;
    const promises = [
      `${host}/${this.dvd}/metadata.json`,
      `${host}/${this.dvd}/vm.json`,
    ]
      .map((url) => fetch(url)
        .then((body) => body.json())
      );

    Promise.all(promises)
      .then(([metadata, vm]) => {
        this.setState({ metadata });
        this.vm = new Vm(vm, this.video);

        // @fixme: How to make it more elegant?
        setTimeout(() => {
          if (!this.vm) {
            return;
          }

          this.vm.start();
        }, 500);
      })
      .catch((err) => {
        //console.error('Could not load the DVD data.', err);
      });
  }

  render() {
    const host = this.props.host || config.host;

    return (
      <div className="Play">
        <Video host={host}
               metadata={this.state.metadata}
               ref={(t) => this.video = t}/>

        <ChapterList metadata={this.state.metadata}/>
      </div>
    );
  }
}

export default Play;
