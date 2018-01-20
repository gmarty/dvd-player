import React, { Component } from 'react';
import { Helmet } from 'react-helmet';
import config from './config';
import Vm from './lib/vm';
import './Play.css';
import Video from './Video';
import ChapterList from './ChapterList';

class Play extends Component {
  state = {
    metadata: [],
  };
  video = null;
  vm = null;

  componentDidMount() {
    const host = this.props.host || config.host;
    const dvd = this.props && this.props.match && this.props.match.params
      && this.props.match.params.dvd;
    const promises = [
      `${host}/${dvd}/metadata.json`,
      `${host}/${dvd}/vm.json`,
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
        }, 1000);
      })
      .catch((err) => {
        //console.error('Could not load the DVD data.', err);
      });
  }

  render() {
    const host = this.props.host || config.host;

    return (
      <section className="Play">
        <Helmet>
          <body className="Play"/>
        </Helmet>

        <Video host={host}
               metadata={this.state.metadata}
               ref={(t) => this.video = t}/>

        <ChapterList metadata={this.state.metadata}/>
      </section>
    );
  }
}

export default Play;
