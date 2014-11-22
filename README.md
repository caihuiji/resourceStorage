resourceStorage
===
resourceStorage 是资源加载器，如果加载过后会进行缓存到localstorage 中，此加载器必须符合以下条件才能发挥全部功能：
- 支持localstorage 
- ajax 跨域请求 (access-control-allow-orgin 请求头)

>如果不支持，支持简单的将script 或 link 生成到 head 中而已。


使用方法
---
1.同源下加载

    resourceStorage.load('test.js' , function (err){
    })

2.跨域加载
    
    resourceStorage.load('http://other.cdn.com/test.js' , function (err){
    })
    
    
缓存问题
---
1.过期时间清除
    加载器默认使用时间过期检测进行清除资源，缓存资源期限为7天，加载器会在加载成后5秒后，进行清除过期的资源。

2.key识别
    由于默认过期时间为7天，假如这其间版本频繁发布，会造成不再使用的资源得不到及时的清除。而且发布的资源往往会对资源名增加md5字段作为版本号，所以提供重写 generateKey 和 generateVersion ，用于在加载的时候能区别出该资源是否最新资源，是否需要更新，例如：
        
       
        resourceStorage.init({
            generateKey : function (){
                return 'testKey'; //test.bb.js  和 test.dd.js 使用 testKey作为key 存储
            } ,
            generateVersion : function (key){
                return key.match( /.+?\.([^\.]+)\.js/i)[1]; //在匹配时候使用 aa 和 bb 对比
            }
            }).load('test.bb.js' , function (){
            // 匹配已经过期，请求最新的资源
            resourceStorage.load('test.dd.js' , function (){

            });
        })
         
    


