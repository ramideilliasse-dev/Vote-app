 import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let isAdmin = false;

// =====================
// 🔐 AUTH
// =====================

window.register = async function(){

  try{

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value.trim();

    if(password.length < 6){
      alert("Mot de passe minimum 6 caractères");
      return;
    }

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    await setDoc(doc(db,"users",user.uid),{

      uid:user.uid,
      email:user.email,

      username:email.split("@")[0],

      role:"user",

      banned:false,

      profileImage:
      "https://cdn-icons-png.flaticon.com/512/149/149071.png",

      coverImage:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600",

      bio:"Salut 👋",

      followers:0,
      likes:0,

      createdAt:serverTimestamp()

    });

    alert("Compte créé !");

  }catch(error){

    console.log(error);

    alert(error.message);
  }
};

window.login = async function(){

  try{

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value.trim();

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    alert("Connecté !");

  }catch(error){

    console.log(error);

    alert(error.message);
  }
};

// =====================
// 🚪 LOGOUT
// =====================

window.logout = async function(){

  await signOut(auth);

  isAdmin = false;

  const authCard =
    document.getElementById("authCard");

  const mainFeed =
    document.getElementById("mainFeed");

  if(authCard){
    authCard.style.display = "flex";
  }

  if(mainFeed){
    mainFeed.style.display = "none";
  }

  const feed =
    document.getElementById("feed");

  if(feed){
    feed.innerHTML = "";
  }

  alert("Déconnecté !");
};

// =====================
// 🔄 SESSION
// =====================

onAuthStateChanged(auth, async(user)=>{

  try{

    const authCard =
      document.getElementById("authCard");

    const mainFeed =
      document.getElementById("mainFeed");

    if(user){

      if(authCard){
        authCard.style.display = "none";
      }

      if(mainFeed){
        mainFeed.style.display = "block";
      }

      await loadProfile(user);

      await loadPosts();

      await loadNotifications();

    }else{

      if(authCard){
        authCard.style.display = "flex";
      }

      if(mainFeed){
        mainFeed.style.display = "none";
      }

      const feed =
        document.getElementById("feed");

      if(feed){
        feed.innerHTML = "";
      }
    }

  }catch(error){

    console.log(error);
  }

});

// =====================
// 👤 PROFILE
// =====================

async function loadProfile(user){

  try{

    const snap =
      await getDoc(doc(db,"users",user.uid));

    if(!snap.exists()) return;

    const data = snap.data();

    const myProfileImage =
      document.getElementById("myProfileImage");

    if(myProfileImage){

      myProfileImage.src =
        data.profileImage ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    }

    const topUsername =
      document.getElementById("topUsername");

    if(topUsername){

      topUsername.innerText =
        data.username || "Utilisateur";
    }
   
// ADMIN / SUPERADMIN
if(
  data.role === "admin" ||
  data.role === "superadmin"
){

  isAdmin = true;

  const adminBtn =
    document.getElementById("adminBtn");

  if(adminBtn){
    adminBtn.style.display = "block";
  }
}

}catch(error){

  console.log(error);
}
}

// =====================
// 👑 ADMIN
// =====================

window.deletePost = async function(postId){

  if(!isAdmin){
    alert("Accès refusé");
    return;
  }

  try{

    await deleteDoc(doc(db,"posts",postId));

    loadPosts();

  }catch(error){

    console.log(error);
  }
};

async function loadUsers(){

  try{

    if(!isAdmin) return;

    const userList =
      document.getElementById("userList");

    if(!userList) return;

    const snapshot =
      await getDocs(collection(db,"users"));

    let html = "";

    snapshot.forEach((docSnap)=>{

      const user = docSnap.data();

      html += `

      <div class="admin-user">

        <img
          src="${
            user.profileImage ||
            'https://cdn-icons-png.flaticon.com/512/149/149071.png'
          }"
          class="admin-user-image"
        >

        <div>

          <div>${user.username || "Utilisateur"}</div>

          <small>${user.email || ""}</small>

        </div>

      </div>

      `;
    });

    userList.innerHTML = html;

  }catch(error){

    console.log(error);
  }
}

// =====================
// 🔔 NOTIFICATIONS
// =====================

async function addNotification(
  toUserId,
  fromUserId,
  type
){

  try{

    if(toUserId === fromUserId) return;

    await addDoc(
      collection(db,"notifications"),
      {
        toUserId,
        fromUserId,
        type,
        createdAt:serverTimestamp()
      }
    );

  }catch(error){

    console.log(error);
  }
}

async function loadNotifications(){

  try{

    const user = auth.currentUser;

    if(!user) return;

    const notifBox =
      document.getElementById("notifList");

    if(!notifBox) return;

    const snapshot =
      await getDocs(collection(db,"notifications"));

    let html = "";

    snapshot.forEach((docSnap)=>{

      const notif = docSnap.data();

      if(notif.toUserId === user.uid){

        let notifText = "";
        let notifIcon = "";

        // LIKE
        if(notif.type === "like"){

          notifIcon = "👍";

          notifText =
            "Votre publication a reçu une réaction";
        }

        // VOTE
        if(notif.type === "vote"){

          notifIcon = "📊";

          notifText =
            "Nouveau vote sur votre publication";
        }

        // COMMENT
        if(notif.type === "comment"){

          notifIcon = "💬";

          notifText =
            "Nouveau commentaire sur votre publication";
        }

        html += `

        <div class="notif-card">

          <div class="notif-icon">
            ${notifIcon}
          </div>

          <div class="notif-content">

            <div class="notif-text">
              ${notifText}
            </div>

            <div class="notif-time">
              Notification récente
            </div>

          </div>

        </div>

        `;
      }
    });

    notifBox.innerHTML =
      html || `
      <div class="notif-empty">
        Aucune notification
      </div>
      `;

  }catch(error){

    console.log(error);
  }
}

// =====================
// 📱 POSTS
// =====================

async function loadPosts(){

  try{

    const feed =
      document.getElementById("feed");

    if(!feed) return;

    const snapshot =
      await getDocs(collection(db,"posts"));

    let posts = [];

    snapshot.forEach((docSnap)=>{

      posts.push({
        id:docSnap.id,
        ...docSnap.data()
      });

    });

    posts.sort((a,b)=>{

      return (
        (b.createdAt?.seconds || 0)
        -
        (a.createdAt?.seconds || 0)
      );

    });

    if(posts.length === 0){

      feed.innerHTML = `
      <div class="empty-posts">
        Aucun post disponible
      </div>
      `;

      return;
    }

    let html = "";

    posts.forEach((post)=>{

      const options =
        Array.isArray(post.options)
        ? post.options
        : [];

      html += `

      <div
  class="fb-post"
  onclick="openPost('${post.id}')"
>

        <div class="fb-header">
<div
  class="post-menu"
  onclick="event.stopPropagation(); togglePostMenu('${post.id}')"
>
  ⋮
</div>
          <div class="fb-user-info">

            <img
              src="${
                post.profileImage ||
                'https://cdn-icons-png.flaticon.com/512/149/149071.png'
              }"
              class="fb-profile"
              onclick="openUserProfile('${post.userId || ""}')"
            >

            <div>

              <div
              class="fb-username"
              onclick="openUserProfile('${post.userId || ""}')">

                ${post.username || "Utilisateur"}

${
  post.role === "superadmin"
  ?
  `<span style="color:#f7b500;">👑</span>`
  :
  post.role === "admin"
  ?
  `<span style="color:#1877f2;">✔️</span>`
  :
  post.verified
  ?
  `<span style="color:#1877f2;">✔️</span>`
  :
  ""
}
              </div>

              <div class="fb-time">
  ${formatTime(post.createdAt)}
</div>

            </div>

         </div>

<button
class="post-menu-btn"
onclick="togglePostMenu('${post.id}')"
>
⋮
</button>

</div>

<div
class="post-menu"
id="menu-${post.id}"
style="display:none;"
>

<button onclick="sharePost('${post.id}')">
📤 Partager
</button>

<button onclick="copyPostLink('${post.id}')">
🔗 Copier lien
</button>

<button onclick="savePost('${post.id}')">
⭐ Enregistrer
</button>

<button onclick="reportPost('${post.id}')">
🚨 Signaler
</button>

${
  (
    auth.currentUser &&
    (
      auth.currentUser.uid === post.userId ||
      isAdmin
    )
  )
  ?
  `
  <button
  onclick="deletePost('${post.id}')"
  style="color:red;">
    🗑️ Supprimer
  </button>
  `
  :
  ""
}

</div>

<div class="fb-question">
          ${post.question || ""}
        </div>

        <div class="fb-options">
      `;

      options.forEach((option,index)=>{

        html += `

        <div class="fb-option-card">

          ${
            option?.imageUrl
            ?
            `
            <img
              src="${option.imageUrl}"
              class="fb-option-image"
              onclick="zoomImage('${option.imageUrl}')"
            >
            `
            :
            `
            <div class="fb-empty-image">
              🖼️
            </div>
            `
          }

          <div class="fb-option-name">
            ${option?.text || ""}
          </div>

          <button
            class="vote-btn"
            onclick="event.stopPropagation(); voteOption('${post.id}', ${index}, event)"
          >
            🗳️ Voter
          </button>

          <div class="vote-count">
            ${option?.votes || 0} votes
          </div>

        </div>

        `;
      });

      html += `

        </div>

        <div class="fb-line"></div>

       <div class="fb-actions">

  <button
  class="fb-action-btn"
  onclick="likePost('${post.id}', event)">

    👍 J’aime (${post.likes || 0})

  </button>

  <button
  class="fb-action-btn"
  onclick="toggleComments('${post.id}')">

    💬 Commentaires (${post.commentCount || 0})

  </button>

  <button
  class="fb-action-btn"
  onclick="sharePost('${post.id}')">

    📤 Partager

  </button>

  ${
    isAdmin
    ?
    `
    <button
    class="fb-action-btn"
    onclick="deletePost('${post.id}')">

      🗑️

    </button>
    `
    :
    ""
  }

</div>

        <div
        class="comments-section"
        id="comments-${post.id}"
        style="display:none;">

          <div id="commentsList-${post.id}"></div>

          <div class="comment-box">

            <input
              type="text"
              id="commentInput-${post.id}"
              placeholder="Écrire un commentaire..."
            >

            <button
            onclick="addComment('${post.id}', event)">

              Envoyer

            </button>

          </div>

        </div>

      </div>

      `;
    });

    feed.innerHTML = html;

    loadAllComments();

  }catch(error){

    console.log(error);

    const feed =
      document.getElementById("feed");

    if(feed){

      feed.innerHTML = `
      <div class="empty-posts">
        Erreur chargement posts
      </div>
      `;
    }
  }
}

// =====================
// 💬 COMMENTS
// =====================

window.toggleComments = function(postId){

  const box =
    document.getElementById("comments-" + postId);

  if(!box) return;

  if(box.style.display === "none"){

    box.style.display = "block";

  }else{

    box.style.display = "none";
  }
};

window.addComment = async function(postId,event){

  try{

    const user = auth.currentUser;

    if(!user){
      alert("Connecte-toi");
      return;
    }

    const button =
      event.target;

    startButtonLoading(button);

    const input =
      document.getElementById(
        "commentInput-" + postId
      );

    const text =
      input.value.trim();

    if(!text){

      stopButtonLoading(button);

      return;
    }

    const userSnap =
      await getDoc(doc(db,"users",user.uid));

    const userData =
      userSnap.data();

    await addDoc(collection(db,"comments"),{

      postId,

      userId:user.uid,

      username:userData.username,
role:userData.role || "user",

verified:userData.verified || false,
      profileImage:
      userData.profileImage || "",

      text,

      createdAt:serverTimestamp()

    });
await updateDoc(
  doc(db,"posts",postId),
  {
    commentCount:
    (
      (
        await getDoc(
          doc(db,"posts",postId)
        )
      ).data().commentCount || 0
    ) + 1
  }
);
    input.value = "";

    await loadComments(postId);

    stopButtonLoading(button);

  }catch(error){

    console.log(error);

    alert("Erreur commentaire");
  }
};

async function loadAllComments(){

  try{

    const posts =
      await getDocs(collection(db,"posts"));

    posts.forEach((post)=>{

      loadComments(post.id);

    });

  }catch(error){

    console.log(error);
  }
}

async function loadComments(postId){

  try{

    const snapshot =
      await getDocs(collection(db,"comments"));

    let html = "";

    snapshot.forEach((docSnap)=>{

      const comment =
        docSnap.data();

      if(comment.postId === postId){

        html += `

        <div class="comment-item">

          <img
            src="${
              comment.profileImage ||
              'https://cdn-icons-png.flaticon.com/512/149/149071.png'
            }"
            class="comment-profile"
          >

          <div class="comment-content">

            <div class="comment-user">
              ${comment.username}
            </div>

            <div class="comment-text">
              ${comment.text}
            </div>

          </div>

        </div>

        `;
      }
    });

    const commentsBox =
      document.getElementById(
        "commentsList-" + postId
      );

    if(commentsBox){
      commentsBox.innerHTML = html;
    }

  }catch(error){

    console.log(error);
  }
}

// =====================
// 🗳️ VOTE
// =====================

window.voteOption = async function(
  postId,
  index,
  event
){

  try{

    const user = auth.currentUser;

    if(!user){
      alert("Connecte-toi");
      return;
    }

    const button =
      event.target;

    startButtonLoading(button);

    const voteRef = doc(
      db,
      "userVotes",
      user.uid + "_" + postId
    );

    const voteSnap =
      await getDoc(voteRef);

    if(voteSnap.exists()){

      stopButtonLoading(button);

      alert("Tu as déjà voté");

      return;
    }

    const postRef =
      doc(db,"posts",postId);

    const postSnap =
      await getDoc(postRef);

    const postData =
      postSnap.data();

    let options =
      postData.options || [];

    options[index].votes =
      (options[index].votes || 0) + 1;

    await updateDoc(postRef,{
      options
    });

    await setDoc(voteRef,{
      userId:user.uid,
      postId,
      option:index,
      createdAt:serverTimestamp()
    });

    await addNotification(
      postData.userId,
      user.uid,
      "vote"
    );

    await loadPosts();

    stopButtonLoading(button);

  }catch(error){

    console.log(error);

    alert("Erreur vote");
  }
};

// =====================
// ❤️ LIKE
// =====================

window.likePost = async function(
  postId,
  event
){

  try{

    const user = auth.currentUser;

    if(!user){
      alert("Connecte-toi");
      return;
    }

    const button =
      event.target;

    startButtonLoading(button);
button.classList.add("like-animation");

setTimeout(()=>{

  button.classList.remove(
    "like-animation"
  );

},300);
    const likeRef = doc(
      db,
      "postLikes",
      user.uid + "_" + postId
    );

    const likeSnap =
      await getDoc(likeRef);

    if(likeSnap.exists()){

      stopButtonLoading(button);

      alert("Déjà liké");

      return;
    }

    const postRef =
      doc(db,"posts",postId);

    const postSnap =
      await getDoc(postRef);

    const postData =
      postSnap.data();

    await updateDoc(postRef,{
      likes:(postData.likes || 0) + 1
    });

    await setDoc(likeRef,{
      userId:user.uid,
      postId
    });

    await addNotification(
      postData.userId,
      user.uid,
      "like"
    );

    await loadPosts();

    stopButtonLoading(button);

  }catch(error){

    console.log(error);

    alert("Erreur like");
  }
};

// =====================
// 📤 SHARE
// =====================

window.sharePost = async function(postId){

  const url =
    window.location.origin +
    "/index.html?post=" +
    postId;

  if(navigator.share){

    try{

      await navigator.share({
        title:"Vote App 🔥",
        text:"Viens voter 🔥",
        url
      });

    }catch(error){

      console.log(error);
    }

  }else{

    await navigator.clipboard.writeText(url);

    alert("Lien copié !");
  }
};

// =====================
// 👤 PROFILE OPEN
// =====================

window.openUserProfile = function(userId){

  window.location.href =
    "profile.html?user=" + userId;
};

window.openMyProfile = function(){

  window.location.href =
    "profile.html";
};

// =====================
// 🔍 IMAGE ZOOM
// =====================

window.zoomImage = function(imageUrl){

  const oldViewer =
    document.getElementById("imageViewer");

  if(oldViewer){
    oldViewer.remove();
  }

  const viewer =
    document.createElement("div");

  viewer.id = "imageViewer";

  viewer.innerHTML = `

    <div class="image-viewer-bg">

      <img
        src="${imageUrl}"
        class="image-viewer-img"
      >

    </div>

  `;

  document.body.appendChild(viewer);

  viewer.onclick = function(){
    viewer.remove();
  };
};

// =====================
// 🔵 BUTTON LOADING
// =====================
// =====================
// ⏱️ FORMAT TIME
// =====================

function formatTime(createdAt){

  if(!createdAt?.seconds){

    return "À l’instant";
  }

  const now =
    Date.now();

  const postTime =
    createdAt.seconds * 1000;

  const diff =
    Math.floor((now - postTime)/1000);

  if(diff < 60){

    return "À l’instant";
  }

  if(diff < 3600){

    return Math.floor(diff/60) +
    " min";
  }

  if(diff < 86400){

    return Math.floor(diff/3600) +
    " h";
  }

  if(diff < 604800){

    return Math.floor(diff/86400) +
    " j";
  }

  return Math.floor(diff/604800) +
  " sem";
}
function startButtonLoading(button){

  if(!button) return;

  button.disabled = true;

  button.dataset.oldText =
    button.innerHTML;

  button.innerHTML =
    `<div class="blue-loader"></div>`;
}

function stopButtonLoading(button){

  if(!button) return;

  button.disabled = false;

  button.innerHTML =
    button.dataset.oldText;
}
window.openPost = function(postId){

  window.location.href =
    "post.html?post=" + postId;
};
// =====================
// ⋮ POST MENU
// =====================

window.togglePostMenu = function(postId){

  const menu =
    document.getElementById(
      "menu-" + postId
    );

  if(!menu) return;

  if(menu.style.display === "none"){

    document
      .querySelectorAll(".post-menu")
      .forEach((m)=>{
        m.style.display = "none";
      });

    menu.style.display = "block";

  }else{

    menu.style.display = "none";
  }
};

window.copyPostLink = async function(postId){

  const url =
    window.location.origin +
    "/index.html?post=" +
    postId;

  await navigator.clipboard.writeText(url);

  alert("Lien copié !");
};

window.savePost = async function(postId){

  try{

    const user =
      auth.currentUser;

    if(!user){

      alert("Connecte-toi");

      return;
    }

    const saveId =
      user.uid + "_" + postId;

    const saveRef =
      doc(db,"savedPosts",saveId);

    const saveSnap =
      await getDoc(saveRef);

    if(saveSnap.exists()){

      alert("Post déjà enregistré ⭐");

      return;
    }

    await setDoc(saveRef,{

      userId:user.uid,

      postId,

      createdAt:
      serverTimestamp()

    });

    alert("Post enregistré ⭐");

  }catch(error){

    console.log(error);

    alert("Erreur sauvegarde");
  }
};

window.reportPost = async function(postId){

  alert("Post signalé 🚨");
};

document.addEventListener("click",(e)=>{

  if(
    !e.target.closest(".post-menu") &&
    !e.target.closest(".post-menu-btn")
  ){

    document
      .querySelectorAll(".post-menu")
      .forEach((menu)=>{
        menu.style.display = "none";
      });
  }
});
/* ===================== */
/* POST MENU */
/* ===================== */

window.togglePostMenu = function(postId){

  const old =
    document.getElementById(
      "menu-" + postId
    );

  if(old){

    old.remove();

    return;
  }

  const post =
    event.target.parentElement;

  const menu =
    document.createElement("div");

  menu.className =
    "post-dropdown";

  menu.id =
    "menu-" + postId;

  menu.innerHTML = `

    <button
      onclick="savePost('${postId}')"
    >
      ⭐ Enregistrer
    </button>

    <button
      onclick="copyPostLink('${postId}')"
    >
      🔗 Copier lien
    </button>

    <button>
      🚨 Signaler
    </button>

  `;

  post.appendChild(menu);
};

/* ===================== */
/* COPY LINK */
/* ===================== */

window.copyPostLink =
async function(postId){

  const url =
    window.location.origin +
    "/post.html?post=" +
    postId;

  await navigator.clipboard.writeText(url);

  alert("Lien copié");
};
/* ===================== */
/* FOLLOW USER */
/* ===================== */

window.followUser = async function(userId){

  try{

    const currentUser =
      auth.currentUser;

    if(!currentUser){

      alert("Connecte-toi");

      return;
    }

    if(currentUser.uid === userId){

      return;
    }

    const followRef =
      doc(
        db,
        "follows",
        currentUser.uid + "_" + userId
      );

    const followSnap =
      await getDoc(followRef);

    if(followSnap.exists()){

      alert("Déjà suivi");

      return;
    }

    await setDoc(followRef,{

      followerId:currentUser.uid,

      followingId:userId,

      createdAt:serverTimestamp()

    });

    // FOLLOWERS
    const userRef =
      doc(db,"users",userId);

    const userSnap =
      await getDoc(userRef);

    const userData =
      userSnap.data();

    await updateDoc(userRef,{

      followers:
      (userData.followers || 0) + 1

    });

    // FOLLOWING
    const currentRef =
      doc(db,"users",currentUser.uid);

    const currentSnap =
      await getDoc(currentRef);

    const currentData =
      currentSnap.data();

    await updateDoc(currentRef,{

      following:
      (currentData.following || 0) + 1

    });

    alert("Utilisateur suivi");

  }catch(error){

    console.log(error);
  }
};
