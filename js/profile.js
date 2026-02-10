/**
 * TaskFlow Profile Logic
 * Handles fetching and updating user profile data.
 */

import {
    auth,
    db,
    onAuthStateChanged,
    signOut,
    doc,
    getDoc,
    updateDoc
} from './firebase.js';

import { setupUserDropdown } from './ui.js';

const elements = {
    displayNameInput: document.getElementById('displayNameInput'),
    emailInput: document.getElementById('emailInput'),
    saveBtn: document.getElementById('saveProfileBtn'),
    joinDate: document.getElementById('joinDate'),
    largeAvatar: document.getElementById('profileUniqueAvatar'),
    userAvatarName: document.getElementById('userAvatarName'),
    profileForm: document.getElementById('profileForm'),
    logoutBtn: document.getElementById('logoutBtn')
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        initUI(user);
        loadProfile(user);
    } else {
        window.location.href = 'signin.html';
    }
});

function initUI(user) {
    setupUserDropdown(user);

    if (elements.logoutBtn) {
        elements.logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = 'signin.html');
    }

    elements.profileForm.onsubmit = (e) => handleSave(e, user.uid);
}

async function loadProfile(user) {
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            elements.displayNameInput.value = data.displayName || "";
            elements.emailInput.value = data.email || user.email;

            // Avatar
            const initial = (data.displayName || user.email).charAt(0).toUpperCase();
            elements.largeAvatar.innerText = initial;
            if (elements.userAvatarName) elements.userAvatarName.innerText = initial;

            // Date
            if (data.createdAt) {
                const date = new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt);
                elements.joinDate.innerText = `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
            }
        } else {
            // Fallback
            elements.emailInput.value = user.email;
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

async function handleSave(e, uid) {
    e.preventDefault();
    const newName = elements.displayNameInput.value;

    if (!newName) return;

    try {
        elements.saveBtn.innerText = "Saving...";
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            displayName: newName
        });

        elements.saveBtn.innerText = "Saved!";
        setTimeout(() => elements.saveBtn.innerText = "Save Changes", 2000);

        // Update avatars immediately
        const initial = newName.charAt(0).toUpperCase();
        elements.largeAvatar.innerText = initial;
        if (elements.userAvatarName) elements.userAvatarName.innerText = initial;

    } catch (error) {
        console.error("Error updating profile:", error);
        elements.saveBtn.innerText = "Error";
    }
}
