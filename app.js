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
  serverTimestamp,
  query,
  where
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

window.register = async function () {
  try{
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if(password.length < 6){
      alert("Mot de passe minimum 6 caractères");
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: email.split("@")[0],
      role: "user",
      banned: false,
      createdAt: serverTimestamp()
    });

    alert("Compte créé !");
  } catch(error){
    alert(error.message);
  }
};


window.login = async function () {
  try{
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    await signInWithEmailAndPassword(auth, email, password);

    alert("Connecté !");
  } catch(error){
    alert(error.message);
  }
};


// =====================
// 🚪 LOGOUT
// =====================

window.logout = async function () {

  await signOut(auth);

  isAdmin = false;

  document.getElementById("profile").style.display = "none";
  document.getElementById("createPost").style.display = "none";
  document.getElementById("feedHeader").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("adminPanel").style.display = "none";

  document.getElementById("authCard").style.display = "block";

  document.getElementById("feed").innerHTML = "";
  document.getElementById("notifList").innerHTML = "";

  alert("Déconnecté !");
};


// =====================
// 🔄 SESSION
// =====================

onAuthStateChanged(auth, async (user) => {

  if(user){

    // cacher connexion
    document.getElementById("authCard").style.display = "none";

    // afficher app
    document.getElementById("profile").style.display = "block";
    document.getElementById("createPost").style.display = "block";
    document.getElementById("feedHeader").style.display = "block";
    document.getElementById("notifications").style.display = "block";

    // charger données
    await loadProfile(user);

    loadPosts();
    loadNotifications();

  } else {

    // afficher connexion
    document.getElementById("authCard").style.display = "block";

    // cacher app
    document.getElementById("profile").style.display = "none";
    document.getElementById("createPost").style.display = "none";
    document.getElementById("feedHeader").style.display = "none";
    document.getElementById("notifications").style.display = "none";

    document.getElementById("feed").innerHTML = "";

  }

});


// =====================
// 👤 PROFIL + ADMIN
// =====================

async function loadProfile(user){

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if(snap.exists()){

    const data = snap.data();

    document.getElementById("profile").style.display = "block";

    document.getElementById("userEmail").innerText =
      "Email : " + data.email;

    document.getElementById("username").innerText =
      "Nom : " + data.username;

    // 👑 ADMIN
    if(data.role === "admin"){

      isAdmin = true;

      document.getElementById("adminPanel").style.display = "block";

      loadUsers();
    }
  }
}


// =====================
// 👑 ADMIN PANEL
// =====================

// 🗑️ supprimer post
window.deletePost = async function(postId){

  if(!isAdmin){
    alert("Accès refusé");
    return;
  }

  await deleteDoc(doc(db, "posts", postId));

  alert("Post supprimé");

  loadPosts();
};


// 🗑️ supprimer tous les posts
window.deleteAllPosts = async function(){

  if(!isAdmin){
    alert("Accès refusé");
    return;
  }

  const snapshot = await getDocs(collection(db, "posts"));

  for(const docSnap of snapshot.docs){
    await deleteDoc(doc(db, "posts", docSnap.id));
  }

  alert("Tous les posts supprimés");

  loadPosts();
};


// 👤 charger utilisateurs
async function loadUsers(){

  if(!isAdmin) return;

  const snapshot = await getDocs(collection(db, "users"));

  let html = "";

  snapshot.forEach((docSnap) => {

    const user = docSnap.data();

    html += `
      <div style="margin-bottom:10px;">
        👤 ${user.email}
        <br>

        <button onclick="banUser('${user.uid}')">
          🚫 Bannir
        </button>

        <button onclick="makeAdmin('${user.uid}')">
          👑 Admin
        </button>

        <button onclick="deleteUser('${user.uid}')">
          🗑️ Supprimer
        </button>
      </div>
    `;
  });

  document.getElementById("userList").innerHTML = html;
}


// 🚫 bannir utilisateur
window.banUser = async function(uid){

  if(!isAdmin) return;

  await updateDoc(doc(db, "users", uid), {
    banned: true
  });

  alert("Utilisateur banni");

  loadUsers();
};


// 👑 rendre admin
window.makeAdmin = async function(uid){

  if(!isAdmin) return;

  await updateDoc(doc(db, "users", uid), {
    role: "admin"
  });

  alert("Utilisateur devenu admin");

  loadUsers();
};


// 🗑️ supprimer utilisateur
window.deleteUser = async function(uid){

  if(!isAdmin) return;

  // supprimer profil
  await deleteDoc(doc(db, "users", uid));

  // supprimer posts utilisateur
  const postsQuery = query(
    collection(db, "posts"),
    where("userId", "==", uid)
  );

  const postsSnap = await getDocs(postsQuery);

  for(const postDoc of postsSnap.docs){
    await deleteDoc(doc(db, "posts", postDoc.id));
  }

  alert("Utilisateur supprimé");

  loadUsers();
  loadPosts();
};


// =====================
// 🔔 NOTIFICATIONS
// =====================

async function addNotification(toUserId, fromUserId, type){

  if(toUserId === fromUserId) return;

  await addDoc(collection(db, "notifications"), {
    toUserId,
    fromUserId,
    type,
    createdAt: serverTimestamp()
  });
}


async function loadNotifications(){

  const user = auth.currentUser;

  const snapshot = await getDocs(collection(db, "notifications"));

  let html = "";

  snapshot.forEach((docSnap) => {

    const notif = docSnap.data();

    if(notif.toUserId === user.uid){

      if(notif.type === "like"){
        html += `<p>❤️ Quelqu’un a aimé ton post</p>`;
      }

      if(notif.type === "follow"){
        html += `<p>👤 Quelqu’un te suit</p>`;
      }

      if(notif.type === "vote"){
        html += `<p>🗳️ Quelqu’un a voté sur ton post</p>`;
      }
    }
  });

  document.getElementById("notifications").style.display = "block";

  document.getElementById("notifList").innerHTML =
    html || "<p>Aucune notification</p>";
}


// =====================
// 📝 CRÉER POST
// =====================

window.createPost = async function(){

  try{

    const user = auth.currentUser;

    if(!user){
      alert("Connecte-toi");
      return;
    }

    const question =
      document.getElementById("question").value.trim();

    const optionA =
      document.getElementById("optionA").value.trim();

    const optionB =
      document.getElementById("optionB").value.trim();

    const file =
      document.getElementById("imageFile")?.files[0];

    if(!question || !optionA || !optionB){
      alert("Remplis tous les champs");
      return;
    }

    // 🔒 limite longueur
    if(question.length > 120){
      alert("Question trop longue");
      return;
    }

    const userSnap = await getDoc(doc(db, "users", user.uid));

    const userData = userSnap.data();

    let imageUrl = "";

    // 📸 upload image ImgBB
    if(file){

      // 🔒 sécurité taille image
      if(file.size > 5000000){
        alert("Image trop lourde");
        return;
      }

      const formData = new FormData();

      formData.append("image", file);

      const res = await fetch(
        "https://api.imgbb.com/1/upload?key=ba51854ee84cfa7eb88af864a04ac02f",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await res.json();

      imageUrl = data.data.url;
    }

    await addDoc(collection(db, "posts"), {
      userId: user.uid,
      username: userData.username,
      question,
      optionA,
      optionB,
      imageUrl,
      votesA: 0,
      votesB: 0,
      likes: 0,
      createdAt: serverTimestamp()
    });

    // reset champs
    document.getElementById("question").value = "";
    document.getElementById("optionA").value = "";
    document.getElementById("optionB").value = "";
    document.getElementById("imageFile").value = "";

    alert("Post publié");

    loadPosts();

  } catch(error){
    alert(error.message);
  }
};


// =====================
// 📱 FEED + ALGORITHME
// =====================

async function loadPosts(){

  const snapshot = await getDocs(collection(db, "posts"));

  let posts = [];

  for(const docSnap of snapshot.docs){

    const post = docSnap.data();

    const id = docSnap.id;

    // 🔥 score
    const score =
      (post.votesA || 0) +
      (post.votesB || 0) +
      (post.likes || 0);

    posts.push({
      id,
      ...post,
      score
    });
  }

  // 🔥 tri populaire
  posts.sort((a, b) => {

    if(b.score === a.score){
      return (b.createdAt?.seconds || 0)
      - (a.createdAt?.seconds || 0);
    }

    return b.score - a.score;
  });

  let html = "";

  posts.forEach((post) => {

    html += `
      <div class="card">

        <h4>👤 ${post.username}</h4>

        <h3>${post.question}</h3>

        ${
          post.imageUrl
          ?
          `<img src="${post.imageUrl}"
          style="width:100%;border-radius:12px;margin:10px 0;">`
          :
          ""
        }

        <button onclick="votePost('${post.id}','A')">
          ${post.optionA}
        </button>

        <button onclick="votePost('${post.id}','B')">
          ${post.optionB}
        </button>

        <p>
          A : ${post.votesA}
          |
          B : ${post.votesB}
        </p>

        <p>❤️ Likes : ${post.likes || 0}</p>

        <p>🔥 Score : ${post.score}</p>

        <button onclick="likePost('${post.id}')">
          ❤️ Like
        </button>

        <button onclick="sharePost('${post.id}')">
          📤 Partager
        </button>

        ${
          isAdmin
          ?
          `<button onclick="deletePost('${post.id}')">
            🗑️ Supprimer
          </button>`
          :
          ""
        }

      </div>
    `;
  });

  document.getElementById("feed").innerHTML = html;
}


// =====================
// 📤 PARTAGE
// =====================

window.sharePost = async function(postId){

  const url =
    window.location.origin + "?post=" + postId;

  if(navigator.share){

    try{

      await navigator.share({
        title: "Vote App 🔥",
        text: "Viens voter sur mon post",
        url: url
      });

    } catch(e){}
  } else {

    await navigator.clipboard.writeText(url);

    alert("Lien copié !");
  }
};


// =====================
// 🔄 REFRESH
// =====================

window.refreshFeed = function(){
  loadPosts();
};


// =====================
// ❤️ LIKE
// =====================

window.likePost = async function(postId){

  const user = auth.currentUser;

  const likeRef = doc(
    db,
    "postLikes",
    user.uid + "_" + postId
  );

  const likeSnap = await getDoc(likeRef);

  // 🔒 anti double like
  if(likeSnap.exists()){
    alert("Déjà liké");
    return;
  }

  const postRef = doc(db, "posts", postId);

  const postSnap = await getDoc(postRef);

  const postData = postSnap.data();

  await updateDoc(postRef, {
    likes: (postData.likes || 0) + 1
  });

  await setDoc(likeRef, {
    userId: user.uid,
    postId
  });

  await addNotification(
    postData.userId,
    user.uid,
    "like"
  );

  alert("❤️ Liké");

  loadPosts();
};


// =====================
// 🗳️ VOTE
// =====================

window.votePost = async function(postId, choice){

  const user = auth.currentUser;

  const voteRef = doc(
    db,
    "userVotes",
    user.uid + "_" + postId
  );

  const voteSnap = await getDoc(voteRef);

  // 🔒 anti double vote
  if(voteSnap.exists()){
    alert("Déjà voté");
    return;
  }

  const postRef = doc(db, "posts", postId);

  const postSnap = await getDoc(postRef);

  let data = postSnap.data();

  if(choice === "A"){
    data.votesA++;
  } else {
    data.votesB++;
  }

  await updateDoc(postRef, {
    votesA: data.votesA,
    votesB: data.votesB
  });

  await setDoc(voteRef, {
    userId: user.uid,
    postId,
    choice,
    createdAt: serverTimestamp()
  });

  await addNotification(
    data.userId,
    user.uid,
    "vote"
  );

  alert("Vote enregistré");

  loadPosts();
};
