import './index.scss';
import $ from 'jquery';
import Mixin from '../utils/mixin';

function Home(router, api) {
  this.router = router;
  this.templateIndex = require('./index.html');
  this.templateGuide = require('./guide.html');
  this.api = api;
}

Home.prototype = {
  index: function () {
    const self = this;
    self.loadConversation(function(resp) {
      $('body').attr('class', 'home layout');
      if (resp.error && resp.error.code === 404 || resp.data && resp.data.category !== 'GROUP') {
        $('#layout-container').html(self.templateGuide());
        return true;
      } else if (resp.data && resp.data.category === 'GROUP') {
        self.loadUsers(resp.data.participants, function (users) {
          self.loadUTXOs(undefined, resp.data, {}, function (utxos) {
            if (Object.keys(utxos).length == 0) {
              return;
            }
            self.loadAssets(0, Object.keys(utxos), {}, function (assets) {
              self.renderWallet(users, assets, utxos);
            });
          });
        });
        return true;
      }
      self.router.updatePageLinks();
    }, new Mixin().conversationId());
  },

  renderWallet: function (users, assets, utxos) {
    const self = this;
  },

  loadUTXOs: function (offset, conv, filter, callback) {
    const self = this;
    var key = self.makeUnique(conv.participants);
    var threshold = self.parseThreshold(conv.name);
    self.api.multisig.list(function (resp) {
      if (resp.error) {
        return false;
      }
      for (var i in resp.data) {
        var utxo = resp.data[i];
        if (utxo.members.sort().join("") !== key) {
          continue;
        }
        if (utxo.threshold !== threshold) {
          continue;
        }
        if (!filter[utxo.asset_id]) {
          filter[utxo.asset_id] = {};
        }
        filter[utxo.asset_id][utxo.utxo_id] = utxo;
      }
      if (resp.data.length < 100) {
        return callback(filter);
      }
      self.loadUTXOs(resp.data[resp.data.length-1].created_at, conv.participants, filter, callback);
    }, offset, 100);
  },

  loadAssets: function (offset, ids, output, callback) {
    const self = this;
    const key = ids.sort().join('');
    var assets = localStorage.getItem(key);
    if (assets) {
      return callback(JSON.parse(assets));
    }
    if (offset === ids.length) {
      localStorage.setItem(key, JSON.stringify(output));
      return callback(output);
    }
    self.api.request('GET', '/assets/' + ids[offset], undefined, function (resp) {
      if (resp.error) {
        return false;
      }
      output[resp.data.asset_id] = resp.data;
      self.loadAssets(offset+1, ids, output, callback);
    });
  },

  loadUsers: function (ps, callback) {
    const key = this.makeUnique(ps);
    var users = localStorage.getItem(key);
    if (users) {
      return callback(JSON.parse(users));
    }
    var ids = [];
    for (var i in ps) {
      ids.push(ps[i].user_id);
    }
    this.api.request('POST', '/users/fetch', ids, function(resp) {
      if (resp.data) {
        localStorage.setItem(key, JSON.stringify(resp.data));
        return callback(resp.data);
      }
    });
  },

  loadConversation: function (callback, id) {
    const self = this;
    const key = 'conversation-' + id;
    var conv = localStorage.getItem(key);
    if (conv) {
      return callback({data:JSON.parse(conv)});
    }
    self.api.account.conversation(function(resp) {
      if (resp.error) {
        return callback(resp);
      }
      localStorage.setItem(key, JSON.stringify(resp.data));
      return callback(resp);
    }, id);
  },

  parseThreshold: function (name) {
    var parts = name.split('^');
    if (parts.length != 2) {
      return -1;
    }
    return parseInt(parts[1]);
  },

  makeUnique: function (ps) {
    var ids = [];
    for (var i in ps) {
      ids.push(ps[i].user_id)
    }
    return ids.sort().join('');
  },
};

export default Home;
