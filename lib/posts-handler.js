'use strict';
let jade = require('jade');
let Cookies = require('cookies');
let moment = require('moment-timezone');
let util = require('./handler-util');
let Post = require('./post');

const trackingIdKey = 'tracking_id';

function handle(req, res) {
  let cookies = new Cookies(req, res);
  addTrackingCookie(cookies);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'charset': 'utf-8'
      });
      Post.findAll({ order: 'id DESC' }).then((posts) => {
        posts.forEach((post) => {
          post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
        });
        res.end(jade.renderFile('./views/posts.jade', {
          posts: posts,
          user: req.user
        }));
        console.info(
          `閲覧されました: user: ${req.user}, ` +
          `trackinId: ${cookies.get(trackingIdKey) },` +
          `remoteAddress: ${req.connection.remoteAddress}, ` +
          `userAgent: ${req.headers['user-agent']} `
          );
      });
      break;
    case 'POST':
      req.on('data', (data) => {
        let decoded = decodeURIComponent(data);
        let content = decoded.split('content=')[1];
        console.info('投稿されました: ' + content);
        Post.create({
          content: content,
          trackingCookie: cookies.get(trackingIdKey),
          postedBy: req.user
        }).then(() => {
          handleRedirectPosts(req, res);
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function handleDelete(req, res) {
  switch (req.method) {
    case 'POST':
      req.on('data', (data) => {
        let decoded = decodeURIComponent(data);
        let id = decoded.split('id=')[1];
        Post.findById(id).then((post) => {
          if (req.user === post.postedBy || req.user === 'admin') {
            post.destroy();
            console.info(
              `削除されました: user: ${req.user}, ` +
              `remoteAddress: ${req.connection.remoteAddress}, ` +
              `userAgent: ${req.headers['user-agent']} `
              );
          }
          handleRedirectPosts(req, res);
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function addTrackingCookie(cookies) {
  if (!cookies.get(trackingIdKey)) {
    let trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    let tomorrow = new Date(new Date().getTime() + (1000 * 60 * 60 * 24));
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
  }
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle: handle,
  handleDelete: handleDelete
};