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

    // ADMIN
    if(data.role === "admin"){

      isAdmin = true;

      const adminPanel =
        document.getElementById("adminPanel");

      if(adminPanel){

        adminPanel.style.display = "block";
      }

      await loadUsers();
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

        if(notif.type === "like"){
          html += `<p>❤️ Quelqu’un a aimé ton post</p>`;
        }

        if(notif.type === "vote"){
          html += `<p>🗳️ Nouveau vote sur ton post</p>`;
        }

        if(notif.type === "comment"){
          html += `<p>💬 Nouveau commentaire</p>`;
        }
      }
    });

    notifBox.innerHTML =
      html || "<p>Aucune notification</p>";

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

      <div class="fb-post">

        <div class="fb-header">

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

              </div>

              <div class="fb-time">
                Publication
              </div>

            </div>

          </div>

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
            onclick="voteOption('${post.id}', ${index}, event)"
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

            💬 Commenter

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

      profileImage:
      userData.profileImage || "",

      text,

      createdAt:serverTimestamp()

    });

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
