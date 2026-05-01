import { db, auth } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// INSCRIPTION
window.register = async function(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await createUserWithEmailAndPassword(auth, email, password);
  alert("Compte créé !");
}

// CONNEXION
window.login = async function(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await signInWithEmailAndPassword(auth, email, password);
  alert("Connecté !");
}

// SESSION
onAuthStateChanged(auth, (user) => {
  if(user){
    document.getElementById("app").style.display = "block";
    loadVotes();
  }
});

// LOAD VOTES
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

// VOTE (ANTI-TRICHE)
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
