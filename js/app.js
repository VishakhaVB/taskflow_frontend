/**
 * TaskFlow Application Logic
 * Handles Firebase Authentication, Firestore Integration, and Dashboard Logic
 */

console.log("App.js: Script loaded and executing.");

import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    updateDoc,
    deleteDoc
} from './firebase.js';

import { setupUserDropdown } from './ui.js';

// --- STATE MANAGEMENT ---
const APP_STATE = {
    user: null, // Managed by Firebase
    tasks: []   // Synced with Firestore
};

// --- AUTHENTICATION ---

// Flag to prevent race conditions during signup
let isSignupInProgress = false;

// Monitor Auth State & Route Protection
onAuthStateChanged(auth, async (user) => {
    console.log("App.js: onAuthStateChanged triggered. User:", user ? user.email : "null");
    APP_STATE.user = user;
    const currentPath = window.location.pathname;
    const page = currentPath.split('/').pop().split('?')[0];

    // If we are currently handling a signup, let that function handle the redirect
    // to ensure Firestore data is written first.
    if (isSignupInProgress && user) {
        console.log("App.js: Auth State changed, but waiting for Signup completion (Lock is active)...");
        return;
    }

    const isAuthPage = page === 'signin.html' || page === 'create_account.html' || page === 'index.html' || page === '';

    if (user) {
        console.log("App.js: Auth State: Logged In as", user.email);

        if (isAuthPage) {
            console.log("App.js: Redirecting to dashboard...");
            window.location.replace('dashboard.html');
        } else {
            // Already on a protected page
            initUserUI(user);
            if (page === 'dashboard.html') {
                subscribeToTasks(user.uid);
            }
        }
    } else {
        console.log("App.js: Auth State: Logged Out");
        if (!isAuthPage) {
            // Only redirect if NOT already on an auth page to prevent loops
            console.log("App.js: Redirecting to signin...");
            window.location.replace('signin.html');
        }
    }
});

// --- HELPER FUNCTIONS ---

// Init User UI (Avatar, etc.)
async function initUserUI(user) {
    const userAvatarName = document.getElementById('userAvatarName');
    if (userAvatarName) {
        setupUserDropdown(user);

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            let name = user.email; // Fallback
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.displayName) name = data.displayName;
            }
            // Display Initial
            userAvatarName.innerText = name.charAt(0).toUpperCase();
        } catch (e) {
            console.log("Error fetching user profile:", e);
            userAvatarName.innerText = user.email.charAt(0).toUpperCase();
        }
    }
}

// Sign Up Handler
async function handleSignup(e) {
    if (e) e.preventDefault();
    console.log("App.js: handleSignup triggered.");

    const signUpBtn = document.getElementById('signUpBtn');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const nameInput = document.getElementById('nameInput');

    const originalBtnText = signUpBtn ? signUpBtn.innerText : "Create Account";

    // Debugging: Log inputs
    console.log("App.js: Reading inputs...");
    const email = emailInput ? emailInput.value : null;
    const password = passwordInput ? passwordInput.value : null;
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : null;
    const name = nameInput ? nameInput.value : null;

    console.log("App.js: Inputs:", { email, name, hasPassword: !!password });

    // Validation
    if (!name) return alert('Please enter your full name');
    if (!email) return alert('Please enter an email address');
    if (!password || password.length < 8) return alert('Password must be at least 8 characters');
    if (confirmPassword !== null && password !== confirmPassword) return alert('Passwords do not match');

    // Lock UI & Set Flag
    if (signUpBtn) {
        signUpBtn.disabled = true;
        signUpBtn.innerText = "Creating Account...";
    }
    isSignupInProgress = true;

    try {
        console.log("App.js: Creating user in Auth...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("App.js: User created:", user.uid);

        // Save User Profile to Firestore
        console.log("App.js: Saving profile to Firestore...");
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            displayName: name,
            email: email,
            photoURL: null,
            createdAt: new Date()
        });
        console.log("App.js: Profile saved.");

        alert("Account created successfully!");

        // Manual Redirect since we blocked the listener
        isSignupInProgress = false;
        console.log("App.js: Redirecting to dashboard manually...");
        window.location.replace('dashboard.html');

    } catch (error) {
        console.error("App.js: Signup Error:", error);
        isSignupInProgress = false; // Reset flag on error

        let msg = "Signup Error: " + error.message;
        if (error.code === 'auth/email-already-in-use') msg = "Email is already in use.";
        if (error.code === 'auth/weak-password') msg = "Password is too weak.";
        alert(msg);

        if (signUpBtn) {
            signUpBtn.disabled = false;
            signUpBtn.innerText = originalBtnText;
        }
    }
}

// Sign In Handler
async function handleLogin(e) {
    if (e) e.preventDefault();
    console.log("App.js: handleLogin triggered.");

    const signInBtn = document.getElementById('signInBtn');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');

    const originalBtnText = signInBtn ? signInBtn.innerText : "Sign In";

    const email = emailInput ? emailInput.value : null;
    const password = passwordInput ? passwordInput.value : null;

    if (!email || !password) {
        return alert('Please enter valid credentials');
    }

    // Lock UI
    if (signInBtn) {
        signInBtn.disabled = true;
        signInBtn.innerText = "Signing In...";
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("App.js: User signed in.");
        // Redirection handled by onAuthStateChanged
    } catch (error) {
        console.error("App.js: Login Error:", error);
        let msg = "Login Error: " + error.message;
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = "Invalid email or password.";
        }
        alert(msg);

        if (signInBtn) {
            signInBtn.disabled = false;
            signInBtn.innerText = originalBtnText;
        }
    }
}

// Logout Handler
async function handleLogout() {
    try {
        await signOut(auth);
        // Redirection handled by onAuthStateChanged
    } catch (error) {
        console.error("Logout Error:", error);
    }
}


// --- FIRESTORE TASK LOGIC ---

function subscribeToTasks(uid) {
    const taskListTodo = document.getElementById('list-todo');
    if (!taskListTodo) return;

    const q = query(collection(db, "tasks"), where("userId", "==", uid));

    onSnapshot(q, (querySnapshot) => {
        APP_STATE.tasks = [];
        querySnapshot.forEach((doc) => {
            APP_STATE.tasks.push({ id: doc.id, ...doc.data() });
        });
        renderDashboard();
    }, (error) => {
        console.error("Error subscribing to tasks:", error);
    });
}

// Add Task 
async function addTask(title, priority, date) {
    if (!APP_STATE.user) return;
    if (!title) return alert("Task title is required");

    try {
        await addDoc(collection(db, "tasks"), {
            userId: APP_STATE.user.uid,
            title: title,
            priority: priority || 'Medium',
            dueDate: date || '',
            status: 'todo',
            createdAt: new Date()
        });
        closeModal();
    } catch (e) {
        console.error("Error adding task: ", e);
        alert("Could not save task.");
    }
}

// Update Status 
async function moveTask(id, newStatus) {
    try {
        const taskRef = doc(db, "tasks", id);
        await updateDoc(taskRef, {
            status: newStatus
        });
    } catch (e) {
        console.error("Error updating task: ", e);
    }
}

// Delete Task 
async function deleteTask(id) {
    if (confirm('Delete this task?')) {
        try {
            await deleteDoc(doc(db, "tasks", id));
        } catch (e) {
            console.error("Error deleting task: ", e);
        }
    }
}


// --- RENDERING (Dashboard) ---

function renderDashboard() {
    const taskListTodo = document.getElementById('list-todo');
    const taskListProgress = document.getElementById('list-progress');
    const taskListDone = document.getElementById('list-done');
    const statTotal = document.getElementById('stat-total');
    const statCompleted = document.getElementById('stat-completed');
    const statProgress = document.getElementById('stat-progress');
    const statUpcoming = document.getElementById('stat-upcoming');

    if (!taskListTodo) return;

    // Clear lists
    taskListTodo.innerHTML = '';
    taskListProgress.innerHTML = '';
    taskListDone.innerHTML = '';

    let stats = { total: 0, done: 0, progress: 0, upcoming: 0 };
    const today = new Date().toISOString().split('T')[0];

    APP_STATE.tasks.forEach(task => {
        stats.total++;
        const s = (task.status || '').toLowerCase().replace(/\s+/g, '');

        if (s === 'completed' || s === 'done') stats.done++;
        else if (s === 'inprogress') stats.progress++;

        if (task.dueDate && task.dueDate >= today) stats.upcoming++;

        const card = createTaskElement(task);

        if (s === 'todo') taskListTodo.appendChild(card);
        else if (s === 'inprogress') taskListProgress.appendChild(card);
        else if (s === 'completed' || s === 'done') taskListDone.appendChild(card);
    });

    if (statTotal) statTotal.innerText = stats.total;
    if (statCompleted) statCompleted.innerText = stats.done;
    if (statProgress) statProgress.innerText = stats.progress;
    if (statUpcoming) statUpcoming.innerText = stats.upcoming;
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'task-card';
    div.onclick = () => {
        let nextStatus = 'todo';
        const s = (task.status || '').toLowerCase().replace(/\s+/g, '');

        if (s === 'todo') nextStatus = 'inprogress';
        else if (s === 'inprogress') nextStatus = 'done';
        else if (s === 'done' || s === 'completed') nextStatus = 'todo';

        moveTask(task.id, nextStatus);
    };

    div.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <div class="task-title">${task.title}</div>
            <div style="color:#ef4444; cursor:pointer;" onclick="event.stopPropagation(); deleteTask('${task.id}')">×</div>
        </div>
        <div class="task-meta">
            <span class="task-priority p-${(task.priority || 'medium').toLowerCase()}">${task.priority || 'Medium'}</span>
            <span class="task-date">${task.dueDate || ''}</span>
        </div>
    `;
    return div;
}

// --- MODAL & FORM ---

function openModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.classList.add('open');
}

function closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    const taskForm = document.getElementById('taskForm');
    if (modalOverlay) modalOverlay.classList.remove('open');
    if (taskForm) taskForm.reset();
}


// --- INITIALIZATION ---

function onReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

onReady(() => {
    console.log("App.js: DOM Content Loaded. Initializing Listeners...");

    // Helper to detect if on auth page by checking for specific elements
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const loginForm = document.querySelector('form');

    if (signInBtn) {
        console.log("App.js: 'Sign In' button found.");
        if (loginForm) {
            console.log("App.js: Form found, attaching handleLogin to onsubmit.");
            loginForm.onsubmit = handleLogin;
        } else {
            console.log("App.js: No form found, attaching handleLogin to click.");
            signInBtn.onclick = handleLogin;
        }
    }

    if (signUpBtn) {
        console.log("App.js: 'Sign Up' button found.");
        if (loginForm) {
            console.log("App.js: Form found, attaching handleSignup to onsubmit.");
            loginForm.onsubmit = handleSignup;
        } else {
            console.log("App.js: No form found, attaching handleSignup to click.");
            signUpBtn.onclick = handleSignup;
        }
    }

    // Dashboard Listeners
    const addTaskBtn = document.getElementById('addTaskBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const taskForm = document.getElementById('taskForm');

    if (addTaskBtn) addTaskBtn.onclick = openModal;
    if (closeModalBtn) closeModalBtn.onclick = closeModal;
    if (logoutBtn) logoutBtn.onclick = handleLogout;

    if (taskForm) {
        taskForm.onsubmit = (e) => {
            e.preventDefault();
            const title = document.getElementById('inputTitle').value;
            const priority = document.getElementById('inputPriority').value;
            const date = document.getElementById('inputDate').value;
            addTask(title, priority, date);
        };
    }
});


