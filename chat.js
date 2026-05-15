 import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params =
  new URLSearchParams(window.location.search);

const otherUserId =
  params.get("user");

// =====================
// 👤 LOAD USER
// =====================

async function loadUser(){

  const snap =
    await getDoc(doc(db,"users",otherUserId));

  if(!snap.exists()) return;

  const data =
    snap.data();

  document.getElementById(
    "chatUsername"
  ).innerText =
    data.username || "Utilisateur";

  document.getElementById(
    "chatUserImage"
  ).src =
    data.profileImage ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";
}

// =====================
// 💬 SEND MESSAGE
// =====================

window.sendMessage = async function(){

  try{

    const user =
      auth.currentUser;

    if(!user) return;

    const input =
      document.getElementById("messageInput");

    const text =
      input.value.trim();

    if(!text) return;

    await addDoc(
      collection(db,"messages"),
      {

        senderId:user.uid,

        receiverId:otherUserId,

        text,

        createdAt:serverTimestamp()

      }
    );

    input.value = "";

    loadMessages();

  }catch(error){

    console.log(error);
  }
};

// =====================
// 📩 LOAD MESSAGES
// =====================

async function loadMessages(){

  try{

    const user =
      auth.currentUser;

    if(!user) return;

    const snapshot =
      await getDocs(collection(db,"messages"));

    let messages = [];

    snapshot.forEach((docSnap)=>{

      const msg =
        docSnap.data();

      const isMyMessage =
        msg.senderId === user.uid &&
        msg.receiverId === otherUserId;

      const isOtherMessage =
        msg.senderId === otherUserId &&
        msg.receiverId === user.uid;

      if(isMyMessage || isOtherMessage){

        messages.push(msg);
      }
    });

    messages.sort((a,b)=>{

      return (
        (a.createdAt?.seconds || 0)
        -
        (b.createdAt?.seconds || 0)
      );
    });

    let html = "";

    messages.forEach((msg)=>{

      const isMine =
        msg.senderId === user.uid;

      html += `

      <div
      class="
      message
      ${isMine ? "my-message" : "other-message"}
      "
      >
        ${msg.text}
      </div>

      `;
    });

    const messagesBox =
      document.getElementById("messages");

    messagesBox.innerHTML = html;

    messagesBox.scrollTop =
      messagesBox.scrollHeight;

  }catch(error){

    console.log(error);
  }
}

// =====================
// 🚀 START
// =====================

auth.onAuthStateChanged((user)=>{

  if(user){

    loadUser();

    loadMessages();

    setInterval(loadMessages,2000);

  }else{

    window.location.href =
      "index.html";
  }
});
