 import { db, auth } from "./firebase.js";
import { 
  doc, getDoc, setDoc, updateDoc, 
  collection, addDoc, getDocs, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =====================
// 🔐 AUTH
// =====================

// INSCRIPTION + PROFIL
window.register = async function(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 👤 créer profil utilisateur
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    username: email.split("@")[0],
    createdAt: serverTimestamp()
  });

  alert("Compte créé !");
}

// CONNEXION
window.login = async function(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await signInWithEmailAndPassword(auth, email, password);
  alert("Connecté !");
}


// =====================
// 🔄 SESSION
// =====================

onAuthStateChanged(auth, (user) => {
  if(user){
    document.getElementById("app").style.display = "none";
    document.getElementById("createPost").style.display = "block";

    loadProfile(user);
    loadPosts();
  }
});


// =====================
// 👤 PROFIL
// =====================

async function loadProfile(user){
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if(snap.exists()){
    const data = snap.data();

    document.getElementById("profile").style.display = "block";
    document.getElementById("userEmail").innerText = "Email: " + data.email;
    document.getElementById("username").innerText = "Nom: " + data.username;
  }
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

  // récupérer username
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
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
// 📱 FEED
// =====================

async function loadPosts(){
  const querySnapshot = await getDocs(collection(db, "posts"));

  let html = "";

  querySnapshot.forEach((docSnap) => {
    const post = docSnap.data();
    const id = docSnap.id;

    html += `
    <div class="card">
      <h4>👤 ${post.username}</h4>
      <h3>${post.question}</h3>

      <button onclick="votePost('${id}','A')">${post.optionA}</button>
      <button onclick="votePost('${id}','B')">${post.optionB}</button>

      <p>Votes: A = ${post.votesA} | B = ${post.votesB}</p>
    </div>
    `;
  });

  document.getElementById("feed").innerHTML = html;
}


// =====================
// 🗳️ VOTE PAR POST
// =====================

window.votePost = async function(postId, choice){
  const user = auth.currentUser;

  const voteRef = doc(db, "userVotes", user.uid + "_" + postId);
  const voteSnap = await getDoc(voteRef);

  if(voteSnap.exists()){
    alert("Tu as déjà voté !");
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


// =====================
// ⚠️ ANCIEN SYSTEME (ON GARDE)
// =====================

async function loadVotes(){
  const ref = doc(db, "votes", "global");
  const snap = await getDoc(ref);

  if(snap.exists()){
    const data = snap.data();
    document.getElementById("result").innerText =
      "Votes: A = " + data.A + " | B = " + data.B;
  } else {
    await setDoc(ref, {A:0, B:0});
  }
}

window.vote = async function(option){
  const user = auth.currentUser;

  const voteRef = doc(db, "votes", "global");
  const userVoteRef = doc(db, "userVotes", user.uid);

  const userVoteSnap = await getDoc(userVoteRef);

  if(userVoteSnap.exists()){
    alert("Tu as déjà voté !");
    return;
  }

  const voteSnap = await getDoc(voteRef);
  let data = voteSnap.data();

  if(option === "A") data.A++;
  else data.B++;

  await updateDoc(voteRef, data);

  await setDoc(userVoteRef, {
    userId: user.uid,
    choice: option
  });

  loadVotes();
}
