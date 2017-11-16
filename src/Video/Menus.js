import React, { Component } from 'react';
import './Menus.css';

class Menus extends Component {
  componentWillReceiveProps({ host, metadata }) {
    if (!this.props.host && this.props.host !== host) {
      throw new Error('Host is not supposed to be updated.');
    }

    if (!this.props.metadata && this.props.metadata !== metadata) {
      throw new Error('Metadata is not supposed to be updated.');
    }
  }

  cssStringToObject(css = '') {
    const obj = {};
    css.split(';')
      .forEach((a) => {
        a = a.split(':');
        obj[a[0]] = a[1];
      });
    return obj;
  }

  render() {
    const host = this.props.host;
    const metadata = this.props.metadata;
    const selectedMenuId = this.props.selectedMenuId;
    const onClick = this.props.onClick;
    const nodes = [];

    if (!host || !metadata) {
      return null;
    }

    metadata.forEach((videos, id) => {
      if (!videos || videos.menu === undefined) {
        return;
      }

      Object.keys(videos.menu).forEach((lang) => {
        videos.menu[lang].forEach((menu) => {
            const xMenu = [];
            const cellID = menu.cellID;
            const vobID = menu.vobID;

            if (cellID === null || vobID === null) {
              return;
            }

            const menuCell = videos.menuCell[String(cellID)][String(vobID)];

            if (menuCell) {
              xMenu.push(
                <img key={`menu-${lang}-${id}-${menu.pgc - 1}-bkg`}
                     src={`${host}${menuCell.still}`}
                     alt="Menu background"/>
              );
            }

            if (videos.css && videos.css[cellID - 1] &&
              videos.css[cellID - 1][vobID - 1]) {
              const css = videos.css[cellID - 1][vobID - 1];
              for (let i = 0; i < css.length; i++) {
                xMenu.push(
                  <input key={`menu-${lang}-${id}-${menu.pgc - 1}-${i}`}
                         type="button"
                         data-id={i}
                         style={this.cssStringToObject(css[i])}/>
                );
              }
            }

            const menuId = `menu-${lang}-${id}-${menu.pgc - 1}`;

            nodes.push(
              <div key={menuId}
                   className="menu"
                   id={menuId}
                   data-domain={id}
                   data-cell={cellID}
                   data-vob={vobID}
                   lang={lang}
                   hidden={menuId !== selectedMenuId}>
                {xMenu}
              </div>
            );
          }
        );
      });
    });

    return (
      <div className="Menus" onClick={onClick}>
        {nodes}
      </div>
    );
  }
}

export default Menus;
