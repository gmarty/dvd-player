import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap-reboot.css';
import './index.css';
import List from './List';
import Play from './Play';
import registerServiceWorker from './registerServiceWorker';

render(
  <Router basename={process.env.PUBLIC_URL}>
    <Fragment>
      <Route exact path="/" component={List}/>
      <Route path="/play/:dvd" component={Play}/>
    </Fragment>
  </Router>,
  document.body
);
registerServiceWorker();
