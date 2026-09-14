const { io } = require('C:/HireMySkills/client/node_modules/socket.io-client');
const http = require('http');

function req(opts, body) {
  return new Promise(resolve => {
    const r = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({s: res.statusCode, d: JSON.parse(d)}); } catch { resolve({s: res.statusCode, d}); } });
    });
    r.on('error', e => resolve({s: 0, d: e.message}));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function testChatFlow() {
  const h = { hostname:'localhost', port:5000, headers:{'Content-Type':'application/json'} };

  console.log('--- Step 1: Register creator & member ---');
  const r1 = await req({...h, path:'/api/auth/register', method:'POST'}, {name:'ChatCreator', email:'chatcreator@test.com', password:'Password123!'});
  const creatorToken = r1.d.token;
  const creatorId = r1.d._id;

  const r2 = await req({...h, path:'/api/auth/register', method:'POST'}, {name:'ChatMember', email:'chatmember@test.com', password:'Password123!'});
  const memberToken = r2.d.token;
  const memberId = r2.d._id;

  console.log('--- Step 2: Create project & approve member ---');
  const r3 = await req({...h, path:'/api/projects', method:'POST', headers:{...h.headers, Authorization:'Bearer '+creatorToken}}, {
    title: 'Chat Test Project',
    description: 'Testing live chat sync between creator and member',
    category: 'webdev',
    level: 'intermediate',
    membersRequired: 2
  });
  const projectId = r3.d._id;

  const r4 = await req({...h, path:'/api/applications/'+projectId, method:'POST', headers:{...h.headers, Authorization:'Bearer '+memberToken}}, {message:'Hey!'});
  const appId = r4.d.application._id;

  await req({...h, path:'/api/applications/'+appId+'/status', method:'PUT', headers:{...h.headers, Authorization:'Bearer '+creatorToken}}, {status:'approved'});
  console.log('Project created and member approved.');

  console.log('--- Step 3: Connect Sockets for both users ---');
  const socketCreator = io('http://localhost:5000', { transports: ['websocket'], auth: { token: creatorToken } });
  const socketMember = io('http://localhost:5000', { transports: ['websocket'], auth: { token: memberToken } });

  await new Promise(r => socketCreator.on('connect', r));
  await new Promise(r => socketMember.on('connect', r));
  console.log('Both sockets connected.');

  socketCreator.emit('join-project', { projectId, user: { _id: creatorId, name: 'ChatCreator' } });
  socketMember.emit('join-project', { projectId, user: { _id: memberId, name: 'ChatMember' } });

  let creatorReceived = null;
  let memberReceived = null;

  socketCreator.on('receive-message', msg => { creatorReceived = msg; });
  socketMember.on('receive-message', msg => { memberReceived = msg; });

  await new Promise(r => setTimeout(r, 600));

  console.log('--- Step 4: Socket Real-Time Send & Broadcast ---');
  socketMember.emit('send-message', {
    projectId,
    senderId: memberId,
    content: 'Hello via Socket!'
  });

  await new Promise(r => setTimeout(r, 1200));

  console.log('  Creator got socket message:', creatorReceived?.content === 'Hello via Socket!' ? 'PASS' : 'FAIL');
  console.log('  Member got socket message:', memberReceived?.content === 'Hello via Socket!' ? 'PASS' : 'FAIL');

  console.log('--- Step 5: REST API Fallback Send & Broadcast ---');
  let creatorGotRestMsg = null;
  let memberGotRestMsg = null;
  socketCreator.on('receive-message', msg => { if (msg.content === 'Hello via REST API!') creatorGotRestMsg = msg; });
  socketMember.on('receive-message', msg => { if (msg.content === 'Hello via REST API!') memberGotRestMsg = msg; });

  const restSendRes = await req({...h, path:'/api/chat/'+projectId+'/messages', method:'POST', headers:{...h.headers, Authorization:'Bearer '+creatorToken}}, {
    content: 'Hello via REST API!'
  });

  console.log('  REST API POST status:', restSendRes.s === 201 ? 'PASS (201 Created)' : 'FAIL (' + restSendRes.s + ')');

  await new Promise(r => setTimeout(r, 1200));
  console.log('  Creator got REST broadcast:', !!creatorGotRestMsg ? 'PASS' : 'FAIL');
  console.log('  Member got REST broadcast:', !!memberGotRestMsg ? 'PASS' : 'FAIL');

  console.log('--- Step 6: Verify Chat History API ---');
  const historyRes = await req({...h, path:'/api/chat/'+projectId+'/messages', method:'GET', headers:{...h.headers, Authorization:'Bearer '+memberToken}});
  console.log('  History status:', historyRes.s === 200 ? 'PASS (200 OK)' : 'FAIL');
  console.log('  Total messages in history:', historyRes.d.length, historyRes.d.length === 2 ? 'PASS (2 messages)' : 'FAIL');

  console.log('--- Step 7: Unauthorized user access check ---');
  const rUnauth = await req({...h, path:'/api/auth/register', method:'POST'}, {name:'Intruder', email:'intruder@test.com', password:'Password123!'});
  const unauthToken = rUnauth.d.token;
  const unauthGet = await req({...h, path:'/api/chat/'+projectId+'/messages', method:'GET', headers:{...h.headers, Authorization:'Bearer '+unauthToken}});
  const unauthPost = await req({...h, path:'/api/chat/'+projectId+'/messages', method:'POST', headers:{...h.headers, Authorization:'Bearer '+unauthToken}}, { content: 'Hack!' });
  console.log('  Unauth GET rejected with 403:', unauthGet.s === 403 ? 'PASS' : 'FAIL');
  console.log('  Unauth POST rejected with 403:', unauthPost.s === 403 ? 'PASS' : 'FAIL');

  socketCreator.disconnect();
  socketMember.disconnect();

  // Cleanup DB
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb://127.0.0.1:27017/hiremyskills');
  await mongoose.connection.db.collection('users').deleteMany({ email: { $in: ['chatcreator@test.com', 'chatmember@test.com', 'intruder@test.com'] } });
  await mongoose.connection.db.collection('projects').deleteMany({ _id: new mongoose.Types.ObjectId(projectId) });
  await mongoose.connection.db.collection('applications').deleteMany({ project: new mongoose.Types.ObjectId(projectId) });
  await mongoose.connection.db.collection('messages').deleteMany({ project: new mongoose.Types.ObjectId(projectId) });
  await mongoose.disconnect();
  console.log('--- All tests completed and cleaned up ---');
}

testChatFlow().catch(console.error);
