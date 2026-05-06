 import { db, auth } from "./firebase.js";
import { 
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs, serverTimestamp 
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
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    username: email.split("@")[0],
    role: "user",
    createdAt: serverTimestamp()
  });

  alert("Compte créé !");
}

window.login = async function(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await signInWithEmailAndPassword(auth, email, password);
  alert("Connecté !");
}


// =====================
// 🚪 LOGOUT
// =====================

window.logout = async function(){
  await signOut(auth);

  isAdmin = false;

  document.getElementById("profile").style.display = "none";
  document.getElementById("createPost").style.display = "none";
  document.getElementById("feedHeader").style.display = "none";
  document.getElementById("notifications").style.display = "none";
  document.getElementById("adminPanel").style.display = "none";

  document.getElementById("authCard").style.display = "block";
  document.getElementById("feed").innerHTML = "";

  alert("Déconnecté !");
}


// =====================
// 🔄 SESSION
// =====================

onAuthStateChanged(auth, async (user) => {
  if(user){
    document.getElementById("app").style.display = "none";
    document.getElementById("createPost").style.display = "block";
    document.getElementById("authCard").style.display = "none";
    document.getElementById("feedHeader").style.display = "block";

    await loadProfile(user);
    loadPosts();
    loadNotifications();
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
    document.getElementById("userEmail").innerText = "Email: " + data.email;
    document.getElementById("username").innerText = "Nom: " + data.username;

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

// supprimer un post
window.deletePost = async function(postId){
  if(!isAdmin) return;

  await deleteDoc(doc(db, "posts", postId));
  alert("Post supprimé");
  loadPosts();
}

// supprimer tous les posts
window.deleteAllPosts = async function(){
  if(!isAdmin) return;

  const snapshot = await getDocs(collection(db, "posts"));

  for (const docSnap of snapshot.docs){
    await deleteDoc(doc(db, "posts", docSnap.id));
  }

  alert("Tous les posts supprimés");
  loadPosts();
}

// charger utilisateurs
async function loadUsers(){
  const snapshot = await getDocs(collection(db, "users"));

  let html = "";

  snapshot.forEach(docSnap => {
    const user = docSnap.data();

    html += `
    <p>
      👤 ${user.email}
      <button onclick="deleteUser('${user.uid}')">❌</button>
    </p>
    `;
  });

  document.getElementById("userList").innerHTML = html;
}

// supprimer utilisateur
window.deleteUser = async function(uid){
  if(!isAdmin) return;

  await deleteDoc(doc(db, "users", uid));
  alert("Utilisateur supprimé");
  loadUsers();
}


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

  snapshot.forEach(doc => {
    const notif = doc.data();

    if(notif.toUserId === user.uid){
      if(notif.type === "like"){
        html += `<p>❤️ Quelqu’un a aimé ton post</p>`;
      }
      if(notif.type === "follow"){
        html += `<p>👤 Quelqu’un te suit</p>`;
      }
    }
  });

  document.getElementById("notifications").style.display = "block";
  document.getElementById("notifList").innerHTML = html;
}


// =====================
// 📝 CRÉER POST
// =====================

window.createPost = async function(){
  const user = auth.currentUser;

  const question = document.getElementById("question").value;
  const optionA = document.getElementById("optionA").value;
  const optionB = document.getElementById("optionB").value;

  if(!question || !optionA || !optionB){
    alert("Remplis tous les champs !");
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();

  await addDoc(collection(db, "posts"), {
    userId: user.uid,
    username: userData.username,
    question,
    optionA,
    optionB,
    votesA: 0,
    votesB: 0,
    createdAt: serverTimestamp()
  });

  alert("Post publié !");
  loadPosts();
}


// =====================
// 📱 FEED + ADMIN BUTTON
// =====================

async function loadPosts(){
  const snapshot = await getDocs(collection(db, "posts"));

  let html = "";

  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const id = docSnap.id;

    html += `
    <div class="card">
      <h4>👤 ${post.username}</h4>
      <h3>${post.question}</h3>

      <button onclick="votePost('${id}','A')">${post.optionA}</button>
      <button onclick="votePost('${id}','B')">${post.optionB}</button>

      <p>Votes: A=${post.votesA} | B=${post.votesB}</p>

      <button onclick="likePost('${id}')">❤️</button>
      <button onclick="sharePost('${id}')">📤</button>

      ${isAdmin ? `<button onclick="deletePost('${id}')">🗑️</button>` : ""}
    </div>
    `;
  });

  document.getElementById("feed").innerHTML = html;
}


// =====================
// 📤 PARTAGE
// =====================

window.sharePost = async function(postId){
  const url = window.location.origin + "?post=" + postId;

  await navigator.clipboard.writeText(url);
  alert("Lien copié !");
}


// =====================
// ❤️ LIKE
// =====================

window.likePost = async function(postId){
  const user = auth.currentUser;

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  const postData = postSnap.data();

  await addNotification(postData.userId, user.uid, "like");

  alert("❤️ Liké !");
}


// =====================
// 🗳️ VOTE
// =====================

window.votePost = async function(postId, choice){
  const user = auth.currentUser;

  const voteRef = doc(db, "userVotes", user.uid + "_" + postId);
  const voteSnap = await getDoc(voteRef);

  if(voteSnap.exists()){
    alert("Déjà voté !");
    return;
  }

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);

  let data = postSnap.data();

  if(choice === "A") data.votesA++;
  else data.votesB++;

  await updateDoc(postRef, data);

  await setDoc(voteRef, {
    userId: user.uid,
    postId,
    choice
  });

  loadPosts();
}
