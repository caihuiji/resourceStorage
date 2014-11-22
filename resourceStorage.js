/*!
 *
 * ResourceStorage.load(opts , callback)
 *  opts - object
 *      url - Number(in seconds) - 记载资源的回调
 *      userCache - Boolean - true - 是否使用缓存
 *      
 * cb - Function - 加载的完成回调
 *
 * ResourceStorage.clear()
 *      清除 localStorage
 *
 * ResourceStorage.config(opts)
 *      ResourceStorage 配置
 *      opts - Object
 *          generateKey - Number(in microseconds) - 存储时候，会调用次方法生成key,默认是url
 *          generateVersion - Number(in seconds) -  存储时候，会调用次方法生成version,默认是'' ，后面用于校验两个资源是否相同版本
 *          expire - Number(in microseconds) - 过期时间
 *          lazyClear - Number(in microseconds) - 延迟处理过期的时间
 *
 *
 *
 */

(function (root) {


    var KEY = 'resourceStorage-key';

    var defaultExpire = 7 * 3600 * 1000; // 7 天过期时间
    var defaultLazyClear = 5000;

    var expire , lazyClear;

    var currentDate = new Date - 0;

    var hasInit = false;


    var config = function (config) {

        hasInit = true;

        storage.data = root.localStorage.getItem(KEY);
        if (!storage.data) {
            storage.data = {};
        }else {
            storage.data = JSON.parse(storage.data );
        }

        config.generateKey && (storage.getKey = config.generateKey);
        config.generateVersion && (storage.getVersion = config.generateVersion);

        if(config.expire){
            expire = config.expire;
        }else {
            expire = defaultExpire;
        }

        if(config.lazyClear){
            lazyClear = config.lazyClear;
        }else {
            lazyClear = defaultLazyClear;
        }


        storage.expiredRemove();

        return ResourceStorage;
    }

    var storage = {
        storageTimeId: null,
        data: {},
        lb: root.localStorage,
        save: function (key, value) {

            if (key) {
                this.data[storage.getKey(key)] = {content: value , expire: new Date - 0 , version : storage.getVersion(key)};
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
                        localStorage.clear(); // clear all localStorage
                        storage.lb.setItem(KEY, itemData);
                    }
                }

                storage.storageTimeId = null;

            }, 500)
        },

        getData: function (key) {
            return this.data[storage.getKey(key)];
        },

        getVersion: function (key) {
            return '';
        },

        /**
         * all true 清除所有， false 清除 KEY 下的 item
         * @param all
         */
        clear: function () {
            this.data = {};

            if (this.storageTimeId) {
                clearTimeout(this.storageTimeId);
            }

            this.lb.setItem(KEY, '');

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
                    if (new Date - storage.data[key].expire > expire) {
                        delete storage.data[key];
                    }
                }
                storage.save();

            }, lazyClear);
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
            config({});
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


        var useCache = true;
        if( opt.hasOwnProperty('useCache')){
            useCache = opt.useCache;
        }

        // 存在且version 相同
        if (useCache && catchData && (content = catchData.content) &&  catchData.version == storage.getVersion(opt.url)) {
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


    root.ResourceStorage = {
        config: config,
        load: load,
        clear: function () {
            storage.clear();
        }
    }
}(window))