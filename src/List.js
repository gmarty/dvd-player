import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import config from './config';
import './List.css';
import Loader from './components/Loader';

class List extends Component {
  state = {
    loading: true,
    list: [],
  };

  componentDidMount() {
    const host = this.props.host || config.host;

    fetch(`${host}/dvds.json`)
      .then((body) => body.json())
      .then((list) => this.setState({ list }))
      .catch((err) => {
        console.error('Could not load the DVD list.', err);
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  }

  render() {
    if (this.state.loading) {
      return (
        <div className="loader-container">
          <Loader/>
        </div>
      );
    }

    if (!this.state.loading && !this.state.list.length) {
      return (
        <div>
          <p>The DVD server could not be reached.</p>
          <p>Have you tried the following?</p>
          <ul>
            <li>Make sure the DVD server is up and running.</li>
            <li>Make sure you have a working internet connection.</li>
          </ul>
        </div>
      );
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
