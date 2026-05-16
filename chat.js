 import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params =
  new URLSearchParams(window.location.search);

const otherUserId =
  params.get("user");

// =====================
// 👤 LOAD USER
// =====================

async function loadUser(){

  try{

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

  }catch(error){

    console.log(error);
  }
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

    // CHAT ID
    const chatId =
      [user.uid, otherUserId]
      .sort()
      .join("_");

    // USER DATA
    const userSnap =
      await getDoc(doc(db,"users",user.uid));

    const userData =
      userSnap.data();

    await addDoc(
      collection(db,"messages"),
      {
await addDoc(
  collection(db,"notifications"),
  {

    toUserId:otherUserId,

    fromUserId:user.uid,

    type:"message",

    text:text,

    createdAt:serverTimestamp()

  }
);
        chatId,

        senderId:user.uid,

        receiverId:otherUserId,

        text,

        username:
          userData.username || "Utilisateur",

        profileImage:
          userData.profileImage || "",

        createdAt:serverTimestamp()

      }
    );

    input.value = "";

  }catch(error){

    console.log(error);
  }
};

// =====================
// 📩 LOAD REALTIME MESSAGES
// =====================

function loadMessagesRealtime(){

  try{

    const user =
      auth.currentUser;

    if(!user) return;

    // CHAT ID
    const chatId =
      [user.uid, otherUserId]
      .sort()
      .join("_");

    const q =
      query(
        collection(db,"messages"),
        where("chatId","==",chatId),
        orderBy("createdAt")
      );

    onSnapshot(q,(snapshot)=>{

      let html = "";

      snapshot.forEach((docSnap)=>{

        const msg =
          docSnap.data();

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

      // AUTO SCROLL
      messagesBox.scrollTop =
        messagesBox.scrollHeight;

    });

  }catch(error){

    console.log(error);
  }
}

// =====================
// ⌨️ ENTER SEND
// =====================

document.addEventListener("DOMContentLoaded",()=>{

  const input =
    document.getElementById("messageInput");

  if(input){

    input.addEventListener("keypress",(e)=>{

      if(e.key === "Enter"){

        e.preventDefault();

        sendMessage();
      }
    });
  }
});

// =====================
// 🚀 START
// =====================

auth.onAuthStateChanged((user)=>{

  if(user){

    loadUser();

    loadMessagesRealtime();

  }else{

    window.location.href =
      "index.html";
  }
});
