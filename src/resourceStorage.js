(function (root) {


    var KEY = 'resourceStorage-key';

    var defaultExpire = 7 * 3600 * 1000; // 7 天过期时间
    var defaultLazyClear = 5000; // 7 天过期时间

    var currentDate = new Date - 0;

    var hasInit = false;


    /**
     *
     * @param config
     *      generateKey - function , 用于生成请求地址和缓存中资源的对应关系
     *      expire - int , 重置过期时间 ,  单位  ms
     *      lazyClear - int , 多少ms后启动过期清除 ,  单位 ms , 必须大于 500 毫秒
     * @returns {{init: init, load: load, clear: clear}|*}
     */
    var init = function (config) {

        hasInit = true;

        storage.data = root.localStorage.getItem(KEY);
        if (!storage.data) {
            storage.data = {};
        }else {
            storage.data = JSON.parse(storage.data );
        }

        config.generateKey && (storage.getKey = config.generateKey);

        config.expire && (defaultExpire = config.expire - 0  );
        config.lazyClear && (defaultLazyClear = config.lazyClear - 0 );

        storage.expiredRemove();

        return resourceStorage;
    }

    var storage = {
        storageTimeId: null,
        data: {},
        lb: root.localStorage,
        save: function (key, value) {

            if (key) {
                this.data[storage.getKey(key)] = {content: value, expire: new Date - 0};
            }

            if (this.storageTimeId) {
                clearTimeout(this.storageTimeId);
            }
            // 延迟存储 ,在频繁存储的时候减少 localStorage 调用
            this.storageTimeId = setTimeout(function () {
                var itemData = JSON.stringify(storage.data);
                try {
                    storage.lb.setItem(KEY, itemData);
                } catch (e) {
                    storage.clear();

                    try {
                        storage.lb.setItem(KEY, itemData);
                    } catch (e) {
                        storage.clear(true);
                        storage.lb.setItem(KEY, itemData);
                    }
                }

                storage.storageTimeId = null;

            }, 500)
        },

        getData: function (key) {
            return this.data[storage.getKey(key)];
        },

        /**
         * all true 清除所有， false 清除 KEY 下的 item
         * @param all
         */
        clear: function (all) {
            this.data = {};

            if (this.storageTimeId) {
                clearTimeout(this.storageTimeId);
            }

            if (all) {
                this.lb.clear();
            } else {
                this.lb.setItem(KEY, '');

            }
        },

        getKey: function (key) {
            return key;
        },

        updateExpire: function (key) {
            var data = this.getData(key);
            if (data) {
                data.expire = currentDate;
            }
        },

        expiredRemove: function () {
            setTimeout(function () {
                if (storage.storageTimeId) {
                    storage.expiredRemove();
                    return;
                }
                for (var key in storage.data) {
                    if (new Date - storage.data[key].expire > defaultExpire) {
                        delete storage.data[key];
                    }
                }
                storage.save();

            }, defaultLazyClear);
        }

    }


    var loadFile = {

        getScriptDom: function (url) {
            var dom = document.createElement('script');
            dom.type = 'text/javascript';

            url && (dom.src = url);

            return dom;
        },

        getLinkDom: function (url) {
            var dom = document.createElement('link');
            dom.type = 'text/css';
            dom.rel = 'stylesheet';
            url && (dom.href = url);
            return dom;
        },

        ajax: function (url, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        callback(null, xhr.responseText)
                    } else {
                        callback({msg: xhr.statusText, type: 'error'}, '')
                    }
                }
            }

            setTimeout(function () {
                if (xhr.readyState < 4) {
                    xhr.abort();
                }
            }, 5000);

            xhr.send();
        },
        appendFile: function (type, content) {
            var dom;
            if (type == 'js') {
                dom = this.getScriptDom()
            } else if (type == 'css') {
                dom = this.getLinkDom();
            }
            dom.innerHTML = content;
            document.head.appendChild(dom);
        }

    }


    var load = function (opt, callback) {
        if (!hasInit) {
            init({});
        }


        if(typeof opt == 'string'){
            opt = {url : opt};
        }

        var type = 'css';
        if (/.+\.css$/.test(opt.url)) {
            type = 'css';
        } else if (/.+\.js$/.test(opt.url)) {
            type = 'js';
        }

        var content , catchData = storage.getData(opt.url);
        if (catchData && (content = catchData.content)) {
            loadFile.appendFile(type, content);
            callback(null);
            storage.updateExpire(opt.url);
            storage.save();
            return;
        }
        loadFile.ajax(opt.url, function (err, content) {
            if (err) {
                var dom;
                if (type == 'css') {
                    dom = loadFile.getLinkDom(opt.url)
                } else if (type == 'js') {
                    dom = loadFile.getScriptDom(opt.url)

                }
                document.head.appendChild(dom);
                dom.onload = dom.onerror = function (e) {
                    callback(e.type == 'error' ? e : null);
                }
            } else {
                loadFile.appendFile(type, content);
                storage.save(opt.url, content);
                callback(null);
            }
        })

    }


    root.resourceStorage = {
        init: init,
        load: load,
        clear: function (all) {
            storage.clear(all);
        }
    }
}(window))