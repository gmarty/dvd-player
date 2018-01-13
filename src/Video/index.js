import React, { Component } from 'react';
import { formatTime } from '../utils';
import './index.css';
import Menus from './Menus';

// For some reasons, encoded videos are 0.1% slower than they should be.
const STRETCH_TIME = 1.001;

class Video extends Component {
  state = {};

  playlist = [];
  chapters = [];

  externalMenuHandler = null;
  externalMenuClickHandler = null;

  // UI
  preTimelinePausedStatus = true;
  timelineMoving = false;

  constructor(props) {
    super(props);

    // @todo host and metadata don't need to be part of the state.
    const host = props.host || '';
    const metadata = props.metadata;
    this.state = {
      host,
      metadata,

      menus: [],

      hasChapters: false, // True when more than 1 video or has text tracks.

      videoIndex: 0,
      menuId: null, // menu-ja-0-1

      // UI
      isPlaying: false,
      muted: false,
      timeLineMax: 0,
      currentTime: 0,
      //timeRemaining: 0,
      volumeSliderValue: 1,
    };
  }

  componentWillReceiveProps(props) {
    const host = props.host || '';
    const metadata = props.metadata;
    this.setState({
      host,
      metadata,

      menus: [],

      hasChapters: false, // True when more than 1 video or has text tracks.

      videoIndex: 0,
      menuId: null, // menu-ja-0-1

      // UI
      isPlaying: false,
      muted: false,
      timeLineMax: 0,
      currentTime: 0,
      //timeRemaining: 0,
      volumeSliderValue: 1,
    });

    this.playlist = [];
    this.chapters = [];

    // UI
    this.preTimelinePausedStatus = true;
    this.timelineMoving = false;
  }

  // Public properties / methods.
  set onmenu(handler) {
    if (typeof handler === 'undefined' || handler === null) {
      this.externalMenuHandler = null;
    }

    if (typeof handler !== 'function') {
      console.error('The menu handler is expecting a function.');
    }

    this.externalMenuHandler = handler;
  }

  get onmenu() {
    return this.externalMenuHandler;
  }

  set onmenuclick(handler) {
    if (typeof handler === 'undefined' || handler === null) {
      this.externalMenuClickHandler = null;
    }

    if (typeof handler !== 'function') {
      console.error('The menu click handler is expecting a function.');
    }

    this.externalMenuClickHandler = handler;
  }

  get onmenuclick() {
    return this.externalMenuHandler;
  }

  once(type, handler) {
    if (this.currentVideo === null) {
      //throw new Error('There is no video currently playing.');
      return;
    }

    console.log(`Video#once() ${type} set up`);

    const fn = () => {
      console.log(`Video#once() ${type} handler executed`);

      // For compatibility with browsers non supporting `once`.
      this.currentVideo.removeEventListener(type, fn);
      handler();
    };
    this.currentVideo.addEventListener(type, fn, { once: true });
  }

  get currentMenuId() {
    return this.state.menuId;
  }

  play() {
    if (this.currentVideo) {
      this.currentVideo.play();
    }
  }

  pause() {
    if (this.currentVideo) {
      this.currentVideo.pause();
    }
  }

  /**
   * Play the video specified by its order in the playlist.
   *
   * @param {number} videoIndex
   */
  playVideoByIndex(videoIndex) {
    if (typeof videoIndex !== 'number') {
      console.error('Invalid video number. An integer is expected.');
      return;
    }
    if (videoIndex < 0 || videoIndex >= this._playlist.length) {
      console.error(`Video requested out of bound (0, ${this._playlist.length - 1}).`);
      return;
    }

    this._changeCurrentVideo(this.currentVideo, this._playlist[videoIndex]);
    this._hideAllMenu();
    this._videoIndex = videoIndex;
    this.play();
  }

  /**
   * Play the video specified by its ID attribute.
   *
   * @param {string} id
   */
  playVideoByID(id) {
    if (id === undefined) {
      console.error('Missing video ID.');
      return;
    }
    if (typeof id !== 'string') {
      id = String(id);
    }

    const videoIndex = this.playlist.findIndex((el) => {
      return el.id === id;
    });

    if (videoIndex === -1) {
      console.error(`Video with ID '${id}' couldn't be found.`);
      return;
    }

    this.setState({ menuId: null }); // Hide the menu.
    this.setState({ videoIndex });
    this.play();
  }

  /**
   * Play the chapter specified by its index in the current video.
   *
   * @param {number} chapterIndex
   */
  playChapterByIndex(chapterIndex) {
    if (!this.currentVideo) {
      console.error('No videos is currently playing.');
      return;
    }
    if (chapterIndex === undefined) {
      console.error('Missing chapter number.');
      return;
    }
    if (typeof chapterIndex !== 'number') {
      console.error('Invalid chapter number.');
      return;
    }
    if (!this.chapters.length || !this.chapters[this.state.videoIndex] || !this.currentChapters.length) {
      console.error('The video has no chapters.');
      return;
    }
    if (chapterIndex < 0 || chapterIndex >= this.currentChapters.length) {
      console.error('Chapter requested out of bound.');
      return;
    }
    if (!this.currentChapters[chapterIndex]) {
      console.error(`The specified chapter doesn't exist.`);
      return;
    }

    this.currentVideo.currentTime =
      this.currentChapters[chapterIndex].startTime * STRETCH_TIME;
    this.play();
  }

  /**
   * Play the menu specified by its ID attribute.
   *
   * @param {string} menuId
   */
  playMenuByID(menuId = '') {
    if (!menuId) {
      console.error('Missing element ID.');
      return;
    }
    if (typeof menuId !== 'string') {
      menuId = String(menuId);
    }

    this.pause();
    this.setState({ menuId });
  }

  // Private properties / methods.
  get currentVideo() {
    const currentVideo = this.playlist[this.state.videoIndex];
    return currentVideo ? currentVideo : null;
  }

  get currentChapters() {
    const currentChapters = this.chapters[this.state.videoIndex];
    return currentChapters ? currentChapters : null;
  }

  videoTags(metadata = []) {
    const nodes = [];

    if (!metadata) {
      return null;
    }

    metadata.forEach((videos, id) => {
      if (!videos || videos.video === undefined) {
        return;
      }

      nodes.push(
        <video key={`video-${id - 1}`}
               id={`video-${id - 1}`}
               data-index={(id - 1)}
               src={videos.video.length ? `${this.state.host}${videos.video[0]}` : null}
               crossOrigin="anonymous"
               playsInline={true}
               hidden={(id - 1) === this.state.videoIndex ? null : true}

               onCanPlay={this.videoCanPlay}
               onPlay={this.videoPlay}
               onPause={this.videoPlay}
               onCanPlayThrough={this.videoDurationChange}
               onLoadedMetadata={this.videoDurationChange}
               onLoadedData={this.videoDurationChange}
               onDurationChange={this.videoDurationChange}
               onTimeUpdate={this.videoTimeUpdate}
               onVolumeChange={this.videoVolumeChange}
               onEnded={this.videoEnded}

               onAbort={this.videoUnhandled}
               onEmptied={this.videoUnhandled}
               onEncrypted={this.videoUnhandled}
               onError={this.videoUnhandled}
               onLoadStart={this.videoUnhandled}
               onPlaying={this.videoUnhandled}
               onProgress={this.videoUnhandled}
               onRateChange={this.videoUnhandled}
               onSeeked={this.videoUnhandled}
               onSeeking={this.videoUnhandled}
               onStalled={this.videoUnhandled}
               onSuspend={this.videoUnhandled}
               onWaiting={this.videoUnhandled}
        >{this.trackTags(videos.vtt)}</video>
      );
    });

    return nodes;
  }

  trackTags(tracks = []) {
    if (!tracks) {
      return null;
    }

    return tracks.map((track, index) =>
      <track key={index}
             kind="chapters"
             src={`${this.state.host}${track}`}
             srcLang="en"
             default={(index === 0)}/>
    );
  }

  // Video events handlers
  videoCanPlay = (evt) => {
    const video = evt.target;
    const index = parseInt(video.dataset.index, 10);

    console.dir(video);

    this.playlist[index] = video;

    if (!video.textTracks) {
      return;
    }

    this.chapters[index] = [];
    this.setState({ hasChapters: true });

    for (let i = 0; i < video.textTracks.length; i++) {
      if (!video.textTracks[i].cues || video.textTracks[i].kind !== 'chapters') {
        continue;
      }
      const cues = [...video.textTracks[i].cues];
      this.chapters[index] = cues.map((cue) => ({
        startTime: cue.startTime,
        endTime: cue.endTime,
        text: cue.text,
      }));
    }

    //console.info(this.chapters);
  };

  videoPlay = (evt) => {
    if (evt.target !== this.currentVideo) {
      return;
    }

    this.setState({ isPlaying: (evt.type === 'play') });
  };

  videoDurationChange = (evt) => {
    if (evt.target !== this.currentVideo) {
      return;
    }

    const timeLineMax = evt.target.duration;
    this.setState({ timeLineMax });
  };

  videoTimeUpdate = (evt) => {
    if (evt.target !== this.currentVideo) {
      return;
    }

    // Fix for Firefox not always firing durationchange event if the
    // video appears multiple times on a page.
    const timeLineMax = evt.target.duration;
    const currentTime = evt.target.currentTime;
    this.setState({ timeLineMax, currentTime });
  };

  videoVolumeChange = (evt) => {
    if (evt.target !== this.currentVideo) {
      return;
    }

    const volumeSliderValue = evt.target.volume;
    const muted = evt.target.muted;
    this.setState({ volumeSliderValue, muted });
  };

  videoEnded = (evt) => {
    if (evt.target !== this.currentVideo) {
      return;
    }

    // At the end of the video, play the next in the playlist, if any.
    let videoIndex = this.state.videoIndex;
    if (videoIndex < this.playlist.length - 1) {
      videoIndex++;
      this.setState({ videoIndex });
      // We delay the playback until after the current is updated.
      setTimeout(() => {
        this.currentVideo.currentTime = 0;
        this.play();
      });
    }
  };

  videoUnhandled = (evt) => {
    if (evt.target !== this.currentVideo) {
      return;
    }

    console.log(`${evt.type} event fired.`);
  };

  // User interaction handlers
  playHandler = (evt) => {
    if (!this.currentVideo) {
      return;
    }

    if (this.currentVideo.paused) {
      this.play();
    } else {
      this.pause();
    }
  };

  rewindHandler = () => {
    const currentTime = this.currentVideo.currentTime;

    // Play previous chapter.
    if (this.currentChapters.length) {
      const currentChapterId = this.getCurrentChapter(currentTime);
      if (currentChapterId >= 0 && this.currentChapters[currentChapterId - 1]) {
        this.currentVideo.currentTime = this.currentChapters[currentChapterId - 1].startTime;
        this.play();
        return;
      }
    }

    let videoIndex = this.state.videoIndex;
    if (this.playlist.length > 1 && videoIndex > 0) {
      videoIndex--;
      this.setState({ videoIndex });
      this.pause();
      setTimeout(() => {
        this.currentVideo.currentTime = 0;
        this.play();
      });
    }
  };

  forwardHandler = () => {
    const currentTime = this.currentVideo.currentTime;

    // Play next chapter.
    if (this.currentChapters.length) {
      const currentChapterId = this.getCurrentChapter(currentTime);
      if (currentChapterId >= 0 && this.currentChapters[currentChapterId + 1]) {
        // We add 0.001 here because if it's not playing the previous
        // chapter is detected as the current chapter and get stuck.
        this.currentVideo.currentTime = this.currentChapters[currentChapterId + 1].startTime + 0.001;
        this.play();
        return;
      }
    }

    // Play next video in the list.
    let videoIndex = this.state.videoIndex;
    if (videoIndex < this.playlist.length - 1) {
      videoIndex++;
      this.setState({ videoIndex });
      this.pause();
      setTimeout(() => {
        this.currentVideo.currentTime = 0;
        this.play();
      });
    }
  };

  muteHandler = () => {
    const volume = this.currentVideo.volume;
    let muted = !this.state.muted;

    if (Math.floor(volume * 500) / 500 === 0) {
      muted = true;
    }

    this.setState({ muted });
    this.currentVideo.muted = muted;
  };

  timelineMouseDownHandler = () => {
    this.preTimelinePausedStatus = this.currentVideo.paused;
    this.currentVideo.pause();
    this.timelineMoving = true;
  };

  timelineMouseMoveHandler = (evt) => {
    const currentTime = evt.target.value;
    this.setState({ currentTime });
    this.currentVideo.currentTime = currentTime;
  };

  timelineMouseUpHandler = () => {
    this.timelineMoving = false;
    if (!this.preTimelinePausedStatus) {
      this.currentVideo.play();
    }
  };

  volumeChangeHandler = (evt) => {
    const volumeSliderValue = evt.target.value;
    const muted = (Math.floor(volumeSliderValue * 500) / 500 === 0);
    this.setState({ volumeSliderValue, muted });
    this.currentVideo.volume = volumeSliderValue;
    this.currentVideo.muted = muted;
  };

  menuHandler = () => {
    this.pause();

    if (this.externalMenuHandler) {
      this.externalMenuHandler.call();
      /*} else if (this.menus[0]) {
        this.menus[0].show();*/
    }
  };

  menuClickHandler = (evt) => {
    const target = evt.target;
    if (target.nodeName.toLowerCase() !== 'input') {
      return;
    }

    if (this.externalMenuClickHandler) {
      this.externalMenuClickHandler.call(null, target);
    }
  };

  // This is set from the VM.
  hasMenus = (hasMenus) => {
    this.setState({ hasMenus });
  };

  /**
   * Return the current chapter id from a list of cues and a time.
   *
   * @param {number} currentTime
   * @return {number}
   */
  getCurrentChapter(currentTime) {
    let currentChapterId = null;

    this.currentChapters.some((cue, chapterId) => {
      if (cue.startTime <= currentTime && currentTime <= cue.endTime) {
        currentChapterId = chapterId;
        return true;
      }
      return false;
    });

    return currentChapterId;
  }

  render() {
    const videoNodes = this.videoTags(this.state.metadata);

    const playButtonClassName = this.state.isPlaying ?
      'media-controls-play-button paused' :
      'media-controls-play-button';
    const muteButtonClassName = this.state.muted ?
      'media-controls-mute-button muted' :
      'media-controls-mute-button';
    // When muted, visually set the volume slider to 0.
    const volumeSliderValue = this.state.muted ?
      0 :
      this.state.volumeSliderValue;

    return (
      <div className="Video">
        <Menus host={this.state.host}
               metadata={this.state.metadata}
               selectedMenuId={this.state.menuId}
               onClick={this.menuClickHandler}/>
        <div className="videos">
          {videoNodes}
        </div>
        <div className="media-controls-enclosure">
          <div className="media-controls-panel">
            <input className="media-controls-rewind-button"
                   type="button"
                   hidden={!this.state.hasChapters}
                   onClick={this.rewindHandler}/>
            <input className={playButtonClassName}
                   type="button"
                   onClick={this.playHandler}/>
            <input className="media-controls-forward-button"
                   type="button"
                   hidden={!this.state.hasChapters}
                   onClick={this.forwardHandler}/>

            <div className="media-controls-current-time-display">
              {formatTime(this.state.currentTime)}
            </div>
            <div className="media-controls-time-remaining-display">
              {`/ ${formatTime(this.state.timeLineMax)}`}
            </div>
            <input className="media-controls-timeline"
                   type="range"
                   value={this.state.currentTime}
                   step="any"
                   max={this.state.timeLineMax}
                   onMouseDown={this.timelineMouseDownHandler}
                   onChange={this.timelineMouseMoveHandler}
                   onMouseUp={this.timelineMouseUpHandler}/>

            <input className={muteButtonClassName}
                   type="button"
                   onClick={this.muteHandler}/>
            <input className="media-controls-volume-slider"
                   type="range"
                   value={volumeSliderValue}
                   step="any"
                   max="1"
                   onChange={this.volumeChangeHandler}/>

            <input className="media-controls-menu-button"
                   type="button"
                   hidden={!this.state.hasMenus}
                   onClick={this.menuHandler}/>
            <input className="media-controls-toggle-closed-captions-button"
                   type="button"
                   hidden/>
            <input className="media-controls-fullscreen-button"
                   type="button"
                   hidden/>
          </div>
        </div>
      </div>
    );
  }
}

export default Video;
