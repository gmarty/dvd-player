import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import config from './config';
import './List.css';

class List extends Component {
  state = {
    list: [],
  };

  componentDidMount() {
    const host = this.props.host || config.host;

    fetch(`${host}/dvds.json`)
      .then((body) => body.json())
      .then((list) => this.setState({ list }))
      .catch((err) => {
        console.error('Could not load the DVD list.', err);
      });
  }

  render() {
    if (!this.state.list || !this.state.list.length) {
      // @todo: Show an error message.
      return null;
    }

    const host = this.props.host || config.host;
    const list = this.state.list
      .map((dvd) => (
        <li key={dvd.dir}
            style={{ backgroundImage: `url('${host}/${dvd.dir}/cover.jpg')` }}
            data-dvd-dir={dvd.dir}>
          <Link to={`/play/${dvd.dir}`}>
            <span>{dvd.name}</span>
          </Link>
        </li>
      ));

    return (
      <section className="List">
        <ul>{list}</ul>
      </section>
    );
  }
}

export default List;
