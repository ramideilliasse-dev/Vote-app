 import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, async(user)=>{

  if(!user){

    window.location.href = "index.html";

    return;
  }

  loadNotifications(user.uid);

});

async function loadNotifications(userId){

  try{

    const container =
      document.getElementById("notificationsList");

    const snapshot =
      await getDocs(collection(db,"notifications"));

    let notifications = [];

    snapshot.forEach((docSnap)=>{

      const notif = docSnap.data();

      if(notif.toUserId === userId){

        notifications.push(notif);
      }

    });

    notifications.sort((a,b)=>{

      return (
        (b.createdAt?.seconds || 0)
        -
        (a.createdAt?.seconds || 0)
      );

    });

    if(notifications.length === 0){

      container.innerHTML = `
        <div class="empty-notif">
          Aucune notification
        </div>
      `;

      return;
    }

    let html = "";

    for(const notif of notifications){

      let userData = {};

      if(notif.fromUserId){

        const userSnap =
          await getDoc(
            doc(db,"users",notif.fromUserId)
          );

        if(userSnap.exists()){

          userData = userSnap.data();
        }
      }

      let text = "";

      if(notif.type === "like"){

        text =
          `${userData.username || "Quelqu’un"} a aimé ton post ❤️`;
      }

      if(notif.type === "vote"){

        text =
          `${userData.username || "Quelqu’un"} a voté sur ton post 🗳️`;
      }

      if(notif.type === "comment"){

        text =
          `${userData.username || "Quelqu’un"} a commenté ton post 💬`;
      }

      html += `

      <div class="notification-card">

        <img
          src="${
            userData.profileImage ||
            'https://cdn-icons-png.flaticon.com/512/149/149071.png'
          }"
          class="notification-avatar"
        >

        <div class="notification-content">

          <div class="notification-text">
            ${text}
          </div>

          <div class="notification-time">
            Nouvelle notification
          </div>

        </div>

      </div>

      `;
    }

    container.innerHTML = html;

  }catch(error){

    console.log(error);
  }
}
