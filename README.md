
# stomp

一款基于stomp、websocket封装实现库

## Install&Usage (安装&使用)

```
# Install(安装)
npm install --save @daoxin/stomp

# Usage(使用)
//浏览器
<script src="https://unpkg.com/@daoxin/stomp"></script>

//ES6
import Stomp from '@daoxin/stomp'

// commonjs
const Stomp = require('@daoxin/stomp')


// example

var url = 'http://localhost/ws/server';
var ws = new SockJS(url);
stomp = Stomp.over(ws);

//或

var url = "ws://localhost:61614/stomp";
stomp = Stomp.client(url);


stomp.heartbeat.outgoing = 2000; //若使用STOMP 1.1 版本，默认开启了心跳检测机制（默认值都是10000ms）
stomp.heartbeat.incoming = 1; //客户端不从服务端接收心跳包

stomp.connect(headers, connectCallback ,errorCallback );

// Success
function connectCallback(frame){
  //连接成功时的回调函数
   stomp.subscribe("/topic/msgInfo", function (result) {  
      var content = result.body;
        console.log("接收订阅消息=>",content);
    }, {});     
}

// Error 
function errorCallback(){
  //连接失败时的回调函数，此函数重新调用连接方法，形成循环，直到连接成功 
}

```


##  `Stomp使用`

* `Stomp.VERSIONS`

```
Stomp.VERSIONS.V1_0 // 1.0
Stomp.VERSIONS.V1_1 // 1.1
Stomp.VERSIONS.V1_2 // 1.2
Stomp.VERSIONS.supportedVersions() // 1.1,1.0
```

* `Stomp.client`

```
var url = "ws://localhost:61614/stomp";
stomp =  Stomp.client(url, protocols)    // stomp
```


* `Stomp.over`

```
var url = 'http://localhost/ws/server';
var ws = new SockJS(url);
stomp =  Stomp.over(ws)   // stomp
```

## `connect()`

```

// [连接到服务器]
// 成功回调
var connectCallback = function() {
  // called back after the client is connected and authenticated to the STOMP server
  //连接成功时的回调函数
  stomp.subscribe("/topic/msgInfo", function (result) {  
    var content = result.body;
      console.log("接收订阅消息=>",content);
  }, {});
};

// 失败回调
var errorCallback = function(error) {
  // display the error's message header:
  console.log(error.headers.message);
};

// 其中login,passcode是字符串，connectCallback和errorCallback是函数
stomp.connect(login, passcode, connectCallback);
stomp.connect(login, passcode, connectCallback, errorCallback);
stomp.connect(login, passcode, connectCallback, errorCallback, host);

//connect()如果您需要传递其他标头，该方法还接受其他两个参数
stomp.connect(headers, connectCallback);
stomp.connect(headers, connectCallback, errorCallback);

var headers = {
  login: 'mylogin',
  passcode: 'mypasscode',
  // additional header
  'client-id': 'my-client-id'
};
stomp.connect(headers, connectCallback);


//断开客户端与服务器的连接
stomp.disconnect(function() {
    // 当客户端断开连接时，它不能再发送或接收消息
    console.log("See you next time!");
};



// [心跳检测]（如果 STOMP 代理接受 STOMP 1.1，则默认启用心跳）

//- 该stomp对象有一个heartbeat字段，可用于通过更改其incoming和outgoing整数字段来配置心跳（两者的默认值都是10000ms）：
stomp.heartbeat.outgoing = 20000; // stomp will send heartbeats every 20000ms
stomp.heartbeat.incoming = 0;     // stomp does not want to receive heartbeats
//- 心跳window.setInterval()用于定期发送心跳和/或检查服务器心跳。


// [发送信息]

stomp.send("/queue/test", {priority: 9}, "Hello, STOMP");
//- 如果要发送带有正文的消息，还必须传递headers 参数。如果您没有要传递的标头，请使用空的 JavaScript 文字{}：
//stomp.send(destination, {}, body);


// [订阅和接收消息]
var subscription = stomp.subscribe("/queue/test", callback);

//默认情况下，如果标题中没有提供，库将生成一个唯一的 ID。要使用您自己的 ID，请使用headers参数传递它：
var mysubid = 'JDI_0001';
var subscription = stomp.subscribe(destination, callback, { id: mysubid });

callback = function(message) {
    // called when the client receives a STOMP message from the server
    if (message.body) {
      alert("got message with body " + message.body)
    } else {
      alert("got empty message");
    }
  });
//该subscribe()方法采用一个可选headers参数来在订阅目标时指定其他标头：
var headers = {ack: 'client', 'selector': "location = 'Europe'"};
stomp.subscribe("/queue/test", message_callback, headers);

//客户端指定它将处理消息确认并且只对接收与选择器匹配的消息感兴趣location = 'Europe'。

//如果要将客户端订阅到多个目的地，可以使用相同的回调来接收所有消息：
onmessage = function(message) {
  // called every time the client receives a message
}
var sub1 = client.subscribe("queue/test", onmessage);
var sub2 = client.subscribe("queue/another", onmessage);

//要停止接收消息，客户端可以在该unsubscribe()方法返回的对象上使用该subscribe() 方法。
var subscription = stomp.subscribe(...);
subscription.unsubscribe();


// [JSON 支持]
STOMP 消息的正文必须是String. 如果要发送和接收 JSON对象，可以使用JSON.stringify()和JSON.parse()将 JSON 对象转换为字符串，反之亦然

var quote = {symbol: 'APPL', value: 195.46};
stomp.send("/topic/stocks", {}, JSON.stringify(quote));
stomp.subcribe("/topic/stocks", function(message) {
  var quote = JSON.parse(message.body);
  alert(quote.symbol + " is at " + quote.value);
};

// [Acknowledgment]

客户端可以选择通过订阅目标并指定设置为或的标头来处理消息确认
在这种情况下，客户端必须使用该message.ack()方法通知服务器它已确认消息。
var subscription = stomp.subscribe("/queue/test",
  function(message) {
    // do something with the message
    ...
    // and acknowledge it
    message.ack();
  },
  {ack: 'client'}
);
该ack()方法接受headers附加标头的参数以确认消息。例如，当ACKSTOMP 帧已被代理有效处理时，可以确认消息作为交易的一部分并要求接收：

var tx = stomp.begin();
message.ack({ transaction: tx.id, receipt: 'my-receipt' });
tx.commit();
该nack()方法还可用于通知 STOMP 1.1 代理客户端未使用该消息。它采用与ack()方法相同的参数。

// [Transactions]

以在事务中发送和确认消息。

一个事务由客户端使用它的begin()方法启动，该方法采用一个可选的transaction，一个唯一标识该事务的字符串。如果没有transaction传递，库将自动生成一个。

此方法返回一个 JavaScript 对象，该对象具有与id交易 ID 对应的属性和两个方法：

commit() 提交交易
abort() 中止交易

然后，客户端可以通过为事务指定一个transaction集合来发送和/或确认事务中的消息 id。

// start the transaction
var tx = stomp.begin();
// send the message in a transaction
stomp.send("/queue/test", {transaction: tx.id}, "message in a transaction");
// commit the transaction to effectively send the message
tx.commit();

// [调试]

客户端可以将其debug属性设置为带有String参数的函数，以查看库的所有调试语句：
stomp.debug = function(str) {
  // append the debug log to a #debug div somewhere in the page using JQuery:
  $("#debug").append(str + "\n");
};
默认情况下，调试消息记录在浏览器窗口的控制台中。


//http://jmesnil.net/stomp-websocket/doc/

```

## 方法（钩子函数和事件函数）

* 调试  `stomp.debug(message)`

* 连接 `stomp.connect(...);`

* 销毁 `stomp.disconnect(disconnectCallback, headers)`

* 发送 `stomp.send(destination, headers, body)`

* 订阅 `stomp.subscribe(destination, callback, headers)`

* 取消订阅 `stomp.unsubscribe(id)`

* 启用 `stomp.begin(transaction)`

* 提交 `stomp.commit(transaction)`

* 中止 `stomp.abort(transaction)`

* 通知服务器已确认消息 `stomp.ack(messageID, subscription, headers)`

* 通知服务器未使用该消息 `stomp.nack(messageID, subscription, headers)`

##  Examples

```
  let stomp = null; //定义全局变量，代表一个session
  const connect = () => {
    //定义连接函数
    if (stomp == null || !stomp.connected) {
      var url = `${config.WS_URL}/digital/ws/server`;
      console.log(`socket连接地址：${url}`);
      // 定义客户端的认证信息,按需求配置
      var headers = {
        // Authorization:store.getters.token
      };
      //连接SockJS的endpoint名称为(/ws/server)
      var sockJS = new SockJS(url);
      // 获取STOMP子协议的客户端对象
      stomp = Stomp.over(sockJS);
      stomp.heartbeat.outgoing = 2000; //若使用STOMP 1.1 版本，默认开启了心跳检测机制（默认值都是10000ms）
      stomp.heartbeat.incoming = 1; //客户端不从服务端接收心跳包
      // console.log("当前处于断开状态,尝试连接");
      // 拦截输出的一大堆垃圾信息
      stomp.debug = function (str) {
        console.log(str + "\n");
      };
      // 向服务器发起websocket连接
      stomp.connect(
        headers,
        () => {
          // /topic/farmingevent 实时农事
          stomp.subscribe("/topic/farmingevent", (result) => {
            const content = parseJSON(result.body);
            dispatch({
              type: FARMINGEVENT_LIST,
              payload: {
                ...state.farmingevent_list,
                rows: [content, ...state?.farmingevent_list?.rows],
              },
            });
            // debugger;
            console.log("[实时农事]接收订阅消息=>", content);
          });
          // /topic/equipment/status  设备状态
          stomp.subscribe("/topic/equipment/status", (result) => {
            const content = parseJSON(result.body);
            // debugger;
            console.log("[设备状态]接收订阅消息=>", content);
          });
          // /topic/meteor/latest    气象最新
          stomp.subscribe("/topic/meteor/latest", (result) => {
            const content = parseJSON(result.body);
            dispatch({
              type: EQUIPMENT_METEOR,
              payload: content.data,
            });
            // debugger;
            console.log("[气象最新]接收订阅消息=>", content);
          });
          // /topic/soil/latest 土壤最新
          stomp.subscribe("/topic/soil/latest", (result) => {
            const content = parseJSON(result.body);
            dispatch({
              type: EQUIPMENT_SOIL,
              payload: content.data,
            });
            // debugger;
            console.log("[土壤最新]接收订阅消息=>", content);
          });
        },
        () => {
          console.log("[errorCallback]=>连接失败....");
        }
      );
    } else {
      console.log("当前处于连接状态");
    }
  };

```

