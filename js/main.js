// main.js - النسخة الكاملة المحسنة مع إصلاح جميع المشاكل

// ======================== تهيئة التطبيق ========================

let currentUser = null;
let isGuest = false;
let isAdmin = false;
let isLoading = false;
let appInitialized = false;

// دالة لتنسيق الأرقام بفاصلة آلاف
function formatNumber(num) {
    if (num === null || num === undefined) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

let cartItems = JSON.parse(localStorage.getItem('cart')) || [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let allProducts = [];
let siteCurrency = 'SDG ';
let siteSettings = {};
let lastToastTime = 0;
let selectedProductForQuantity = null;

// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
    authDomain: "queen-beauty-b811b.firebaseapp.com",
    projectId: "queen-beauty-b811b",
    storageBucket: "queen-beauty-b811b.firebasestorage.app",
    messagingSenderId: "418964206430",
    appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
};

let app, auth, db;

// متغيرات للهيدر الذكي
let lastScrollTop = 0;

// ======================== إدارة شاشة التحميل ========================

// دالة لإخفاء شاشة التحميل
function hideLoader() {
    console.log('🔄 إخفاء شاشة التحميل...');
    const loader = document.getElementById('initialLoader');
    if (loader && loader.style.display !== 'none') {
        loader.style.transition = 'opacity 0.5s ease';
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            console.log('✅ تم إخفاء شاشة التحميل');
        }, 500);
    }
    isLoading = false;
}

// دالة إجبارية لإخفاء شاشة التحميل
function forceHideLoader() {
    console.log('⏱️ إخفاء شاشة التحميل إجبارياً...');
    const loader = document.getElementById('initialLoader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 100);
    }
    isLoading = false;
}

// إخفاء شاشة التحميل بعد 8 ثواني كحد أقصى
setTimeout(forceHideLoader, 8000);

// ======================== التحقق من Firebase SDK ========================

function checkFirebaseSDK() {
    if (!window.firebaseModules) {
        console.error('❌ Firebase SDK لم يتم تحميله');
        forceHideLoader();
        
        // عرض رسالة خطأ للمستخدم
        const loader = document.getElementById('initialLoader');
        if (loader) {
            loader.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i class="fas fa-exclamation-triangle fa-3x" style="color: #f39c12; margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">خطأ في الاتصال</h3>
                    <p style="color: var(--gray-color); margin-bottom: 20px;">تعذر تحميل المكتبات المطلوبة. يرجى:</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.location.reload()" style="padding: 10px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo';">
                            <i class="fas fa-redo"></i> تحديث الصفحة
                        </button>
                        <button onclick="signInAsGuest()" style="padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-family: 'Cairo';">
                            <i class="fas fa-user"></i> الدخول كضيف
                        </button>
                    </div>
                </div>
            `;
        }
        return false;
    }
    return true;
}

// ======================== تهيئة Firebase الآمنة ========================

function initializeFirebase() {
    if (app) {
        console.log('⚠️ Firebase مهيأ بالفعل');
        return true;
    }
    
    try {
        app = window.firebaseModules.initializeApp(firebaseConfig);
        auth = window.firebaseModules.getAuth(app);
        db = window.firebaseModules.getFirestore(app);
        console.log('✅ Firebase مهيأ بنجاح');
        return true;
    } catch (error) {
        console.error('❌ خطأ في تهيئة Firebase:', error);
        return false;
    }
}

// ======================== تهيئة التطبيق الآمنة ========================

async function initializeAppSafely() {
    if (appInitialized) {
        console.log('⚠️ التطبيق مهيأ بالفعل');
        return;
    }
    
    console.log('🚀 بدء تهيئة التطبيق بشكل آمن...');
    appInitialized = true;
    
    // التحقق من Firebase SDK
    if (!checkFirebaseSDK()) {
        return;
    }
    
    // تهيئة Firebase
    if (!initializeFirebase()) {
        forceHideLoader();
        showAuthScreen();
        showToast('حدث خطأ في الاتصال. يمكنك الدخول كضيف.', 'warning');
        return;
    }
    
    try {
        // تحميل إعدادات الموقع والألوان
        await Promise.all([
            loadSiteConfig(),
            loadThemeColors()
        ]);
        
        // إعداد جميع الأحداث
        setupAllEventListeners();
        setupRegistrationEventListeners();
        setupSmartHeader();
        
        // مراقبة حالة المصادقة
        const unsubscribe = window.firebaseModules.onAuthStateChanged(auth, 
            async (user) => {
                console.log('🔄 تغيرت حالة المصادقة:', user ? 'مستخدم مسجل' : 'لا يوجد مستخدم');
                await handleAuthStateChange(user);
            },
            (error) => {
                console.error('❌ خطأ في مراقبة حالة المصادقة:', error);
                handleAuthError();
            }
        );
        
        // حفظ المرجع لإلغاء الاشتراك عند الحاجة
        window.authUnsubscribe = unsubscribe;
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة التطبيق:', error);
        forceHideLoader();
        showAuthScreen();
        showToast('حدث خطأ في تحميل التطبيق.', 'error');
    }
}

// ======================== معالجة حالة المصادقة ========================

async function handleAuthStateChange(user) {
    try {
        if (user) {
            // مستخدم مسجل عبر Firebase
            currentUser = user;
            isGuest = false;
            
            // التحقق من صلاحيات المدير
            await checkAdminPermissions(user.uid);
            
            // تحديث الواجهة
            showMainApp();
            showSection('home');
            updateUserProfile();
            await loadProducts();
            updateCartCount();
            updateAdminButton();
            
            showToast(`مرحباً بعودتك ${user.displayName || 'مستخدم'}!`, 'success');
        } else {
            // لا يوجد مستخدم مسجل في Firebase
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    if (userData.isGuest) {
                        currentUser = userData;
                        isGuest = true;
                        isAdmin = false;
                        
                        showMainApp();
                        showSection('home');
                        updateUserProfile();
                        await loadProducts();
                        updateCartCount();
                        updateAdminButton();
                        
                        console.log('👤 تم استعادة المستخدم الضيف');
                    } else {
                        showAuthScreen();
                    }
                } catch (e) {
                    console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
                    localStorage.removeItem('currentUser');
                    showAuthScreen();
                }
            } else {
                showAuthScreen();
            }
        }
        
        // إخفاء شاشة التحميل
        hideLoader();
        
    } catch (error) {
        console.error('❌ خطأ في معالجة حالة المصادقة:', error);
        hideLoader();
        showAuthScreen();
    }
}

function handleAuthError() {
    console.log('⚠️ فشل الاتصال بمصادقة Firebase');
    
    // محاولة استعادة المستخدم الضيف
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            if (userData.isGuest) {
                currentUser = userData;
                isGuest = true;
                isAdmin = false;
                
                showMainApp();
                showSection('home');
                updateUserProfile();
                loadProducts();
                updateCartCount();
                updateAdminButton();
                
                showToast('تم الاتصال في وضع عدم الاتصال', 'warning');
                hideLoader();
                return;
            }
        } catch (e) {
            console.error('❌ خطأ في قراءة بيانات المستخدم:', e);
        }
    }
    
    forceHideLoader();
    showAuthScreen();
    showToast('تعذر الاتصال بالخادم. يمكنك الدخول كضيف.', 'warning');
}

// ======================== إدارة المستخدمين ========================

// تسجيل الدخول كضيف
function signInAsGuest() {
    console.log('👤 تسجيل الدخول كضيف...');
    
    // تنظيف أي بيانات مستخدم سابقة
    localStorage.removeItem('currentUser');
    
    currentUser = {
        uid: 'guest_' + Date.now(),
        displayName: 'زائر',
        email: null,
        photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        isGuest: true
    };
    
    isGuest = true;
    isAdmin = false;
    
    // حفظ بيانات المستخدم
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // إخفاء زر المدير
    updateAdminButton();
    
    // إظهار التطبيق الرئيسي
    showMainApp();
    showSection('home');
    updateUserProfile();
    loadProducts();
    updateCartCount();
    
    showToast('مرحباً بك يا زائر! يمكنك التسوق الآن', 'success');
    hideLoader();
}

// تسجيل الدخول بـ Google
async function signInWithGoogle() {
    try {
        console.log('🔑 تسجيل الدخول بـ Google...');
        
        if (!checkFirebaseSDK() || !initializeFirebase()) {
            showToast('تعذر الاتصال بخدمة المصادقة', 'error');
            return;
        }
        
        const provider = new window.firebaseModules.GoogleAuthProvider();
        const result = await window.firebaseModules.signInWithPopup(auth, provider);
        
        currentUser = result.user;
        isGuest = false;
        
        // التحقق إذا كان المستخدم جديداً
        await checkAndCreateUserInFirestore(currentUser);
        
        // التحقق من صلاحيات المدير
        await checkAdminPermissions(currentUser.uid);

        // حفظ بيانات المستخدم مع حالة الأدمن
        localStorage.setItem('currentUser', JSON.stringify({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            isGuest: false,
            isAdmin: isAdmin
        }));
        
        showMainApp();
        showSection('home');
        updateUserProfile();
        await loadProducts();
        updateCartCount();
        
        showToast(`مرحباً بك ${currentUser.displayName}!`, 'success');
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
        showToast('حدث خطأ في تسجيل الدخول', 'error');
    }
}

// التحقق من صحة البريد الإلكتروني
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// مسح حقول التسجيل
function clearRegistrationForm() {
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPhone').value = '';
    
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }
}

// إنشاء حساب جديد
async function signUpWithEmail(email, password, name, phone = '') {
    try {
        console.log('📝 إنشاء حساب جديد...');
        
        // التحقق من المدخلات
        if (!email || !password || !name) {
            showToast('الرجاء ملء جميع الحقول المطلوبة', 'warning');
            return false;
        }
        
        if (password.length < 6) {
            showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
            return false;
        }
        
        if (!validateEmail(email)) {
            showToast('البريد الإلكتروني غير صالح', 'warning');
            return false;
        }
        
        // التحقق من Firebase
        if (!checkFirebaseSDK() || !initializeFirebase()) {
            showToast('تعذر الاتصال بخدمة التسجيل', 'error');
            return false;
        }
        
        // إنشاء المستخدم في Firebase Authentication
        const result = await window.firebaseModules.createUserWithEmailAndPassword(auth, email, password);
        
        // تحديث ملف تعريف المستخدم في Auth
        await window.firebaseModules.updateProfile(result.user, {
            displayName: name,
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        });
        
        currentUser = result.user;
        isGuest = false;
        isAdmin = false;
        
        // إنشاء وثيقة المستخدم في Firestore
        const userData = {
            email: email,
            name: name,
            phone: phone,
            address: '',
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            role: 'user',
            isAdmin: false,
            isGuest: false,
            isActive: true,
            totalOrders: 0,
            totalSpent: 0,
            favorites: [],
            createdAt: window.firebaseModules.serverTimestamp(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
        await window.firebaseModules.setDoc(userRef, userData);
        
        console.log('✅ تم إنشاء حساب المستخدم بنجاح في قاعدة البيانات');
        
        // حفظ بيانات المستخدم في localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            uid: currentUser.uid,
            displayName: name,
            email: email,
            photoURL: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            isGuest: false,
            isAdmin: false,
            role: 'user'
        }));
        
        // إظهار التطبيق الرئيسي
        showMainApp();
        showSection('home');
        updateUserProfile();
        await loadProducts();
        updateCartCount();
        updateAdminButton();
        
        // إرسال إشعار نجاح
        showToast(`تم إنشاء حسابك بنجاح ${name}!`, 'success');
        
        // إخفاء نموذج التسجيل
        hideEmailAuthForm();
        
        // مسح الحقول
        clearRegistrationForm();
        
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء الحساب:', error);
        
        let errorMessage = 'حدث خطأ في إنشاء الحساب';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'عملية إنشاء الحساب غير مسموحة';
                break;
            case 'auth/weak-password':
                errorMessage = 'كلمة المرور ضعيفة جداً';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'خطأ في الاتصال بالشبكة';
                break;
        }
        
        showToast(errorMessage, 'error');
        return false;
    }
}

// تسجيل الدخول بالبريد
async function signInWithEmail(email, password) {
    try {
        console.log('📧 تسجيل الدخول بالبريد...');
        
        if (!checkFirebaseSDK() || !initializeFirebase()) {
            showToast('تعذر الاتصال بخدمة المصادقة', 'error');
            return;
        }
        
        const result = await window.firebaseModules.signInWithEmailAndPassword(auth, email, password);
        
        currentUser = result.user;
        isGuest = false;
        
        // التحقق من وجود المستخدم في قاعدة البيانات
        await checkAndUpdateUserInFirestore(currentUser);
        
        // التحقق من صلاحيات المدير
        await checkAdminPermissions(currentUser.uid);
        
        // حفظ بيانات المستخدم مع حالة الأدمن
        localStorage.setItem('currentUser', JSON.stringify({
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            photoURL: currentUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            isGuest: false,
            isAdmin: isAdmin
        }));
        
        showMainApp();
        showSection('home');
        updateUserProfile();
        await loadProducts();
        updateCartCount();
        updateAdminButton();
        
        showToast(`مرحباً بعودتك ${currentUser.displayName}!`, 'success');
        
        hideEmailAuthForm();
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        
        let errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'المستخدم غير موجود';
                break;
            case 'auth/wrong-password':
                errorMessage = 'كلمة المرور غير صحيحة';
                break;
            case 'auth/invalid-email':
                errorMessage = 'البريد الإلكتروني غير صالح';
                break;
            case 'auth/user-disabled':
                errorMessage = 'تم تعطيل هذا الحساب';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'خطأ في الاتصال بالشبكة';
                break;
        }
        
        showToast(errorMessage, 'error');
    }
}

// التحقق وتحديث بيانات المستخدم في Firestore
async function checkAndUpdateUserInFirestore(user) {
    try {
        if (!db) return;
        
        const userRef = window.firebaseModules.doc(db, "users", user.uid);
        const userDoc = await window.firebaseModules.getDoc(userRef);
        
        if (!userDoc.exists()) {
            const userData = {
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                phone: '',
                address: '',
                photoURL: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                role: 'user',
                isAdmin: false,
                isGuest: false,
                isActive: true,
                totalOrders: 0,
                totalSpent: 0,
                favorites: [],
                createdAt: window.firebaseModules.serverTimestamp(),
                updatedAt: window.firebaseModules.serverTimestamp()
            };
            
            await window.firebaseModules.setDoc(userRef, userData);
        } else {
            // تحديث آخر مرة دخول
            await window.firebaseModules.updateDoc(userRef, {
                lastLogin: window.firebaseModules.serverTimestamp(),
                updatedAt: window.firebaseModules.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
    }
}

// التحقق وتهيئة المستخدم في Firestore
async function checkAndCreateUserInFirestore(user) {
    try {
        if (!db) return;
        
        const userDoc = await window.firebaseModules.getDoc(
            window.firebaseModules.doc(db, "users", user.uid)
        );
        
        if (!userDoc.exists()) {
            await window.firebaseModules.setDoc(
                window.firebaseModules.doc(db, "users", user.uid), 
                {
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    phone: '',
                    address: '',
                    photoURL: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                    role: 'user',
                    isAdmin: false,
                    isGuest: false,
                    totalOrders: 0,
                    totalSpent: 0,
                    favorites: [],
                    createdAt: window.firebaseModules.serverTimestamp(),
                    updatedAt: window.firebaseModules.serverTimestamp()
                }
            );
        }
    } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
    }
}

// التحقق من صلاحيات المدير
async function checkAdminPermissions(userId) {
    console.log('🔍 التحقق من صلاحيات المدير للمستخدم:', userId);
    
    try {
        if (!db) {
            isAdmin = false;
            console.log('❌ قاعدة البيانات غير متاحة');
            return false;
        }
        
        const userRef = window.firebaseModules.doc(db, "users", userId);
        const userSnap = await window.firebaseModules.getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.isAdmin === true || userData.role === 'admin') {
                isAdmin = true;
                console.log('✅ المستخدم أدمن');
            } else {
                isAdmin = false;
                console.log('❌ المستخدم ليس أدمن');
            }
        } else {
            console.log('⚠️ المستخدم غير موجود في قاعدة البيانات');
            isAdmin = false;
        }
        
        updateAdminButton();
        
        return isAdmin;
        
    } catch (error) {
        console.error('❌ خطأ في التحقق من صلاحيات المستخدم:', error);
        isAdmin = false;
        updateAdminButton();
        return false;
    }
}

// تحديث زر الأدمن في الواجهة
function updateAdminButton() {
    const adminBtn = document.getElementById('adminBtn');
    const adminMobileLink = document.getElementById('adminMobileLink');
    
    if (adminBtn) {
        if (isAdmin && !isGuest) {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }
    }
    
    if (adminMobileLink) {
        if (isAdmin && !isGuest) {
            adminMobileLink.style.display = 'block';
        } else {
            adminMobileLink.style.display = 'none';
        }
    }
}

// تسجيل الخروج
async function signOutUser() {
    console.log('🚪 تسجيل الخروج...');
    
    try {
        if (!isGuest && auth) {
            await window.firebaseModules.signOut(auth);
        }
        
        // تنظيف جميع البيانات
        localStorage.removeItem('currentUser');
        currentUser = null;
        isGuest = false;
        isAdmin = false;
        
        // إلغاء اشتراك مراقبة المصادقة
        if (window.authUnsubscribe) {
            window.authUnsubscribe();
        }
        
        updateAdminButton();
        showAuthScreen();
        
        showToast('تم تسجيل الخروج بنجاح', 'success');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
        showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
}

// ======================== تحميل الألوان ========================

// تحميل إعدادات الألوان
async function loadThemeColors() {
    try {
        if (!db) return;
        
        const colorsRef = window.firebaseModules.doc(db, "settings", "theme_colors");
        const colorsSnap = await window.firebaseModules.getDoc(colorsRef);
        
        if (colorsSnap.exists()) {
            const colors = colorsSnap.data();
            applyThemeColors(colors);
        }
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الألوان:', error);
    }
}

// تطبيق الألوان على الموقع
function applyThemeColors(colors) {
    const root = document.documentElement;
    
    if (colors.primaryColor) {
        root.style.setProperty('--primary-color', colors.primaryColor);
    }
    if (colors.secondaryColor) {
        root.style.setProperty('--secondary-color', colors.secondaryColor);
    }
    if (colors.successColor) {
        root.style.setProperty('--success-color', colors.successColor);
    }
    if (colors.dangerColor) {
        root.style.setProperty('--danger-color', colors.dangerColor);
    }
    if (colors.warningColor) {
        root.style.setProperty('--warning-color', colors.warningColor);
    }
    if (colors.lightColor) {
        root.style.setProperty('--light-color', colors.lightColor);
    }
}

// ======================== إدارة المنتجات ========================

// تحميل المنتجات من Firebase فقط
async function loadProducts() {
    console.log('🛍️ جاري تحميل المنتجات من Firebase...');
    
    if (isLoading) {
        console.log('⚠️ المنتجات قيد التحميل بالفعل، تخطي...');
        return;
    }
    
    isLoading = true;
    
    try {
        if (!db) {
            console.log('❌ قاعدة البيانات غير متاحة');
            displayNoProductsMessage();
            return;
        }
        
        const productsRef = window.firebaseModules.collection(db, "products");
        const q = window.firebaseModules.query(
            productsRef, 
            window.firebaseModules.where("isActive", "==", true)
        );
        
        const querySnapshot = await window.firebaseModules.getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('⚠️ لا توجد منتجات في قاعدة البيانات');
            displayNoProductsMessage();
            return;
        }
        
        allProducts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'بدون اسم',
                price: data.price || 0,
                originalPrice: data.originalPrice || null,
                image: data.image || 'https://via.placeholder.com/300x200?text=صورة',
                category: data.category || 'غير مصنف',
                stock: data.stock || 0,
                description: data.description || '',
                isNew: data.isNew || false,
                isSale: data.isSale || false,
                isBest: data.isBest || false,
                isActive: data.isActive !== false,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            };
        });
        
        console.log(`✅ تم تحميل ${allProducts.length} منتج من Firebase`);
        
        displayProducts();
        displayFeaturedProducts();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات من Firebase:', error);
        displayNoProductsMessage();
    } finally {
        isLoading = false;
    }
}

// عرض رسالة عدم وجود منتجات
function displayNoProductsMessage() {
    const productsGrid = document.getElementById('productsGrid');
    const featuredGrid = document.getElementById('featuredProductsGrid');
    
    const message = `
        <div style="text-align: center; padding: 40px 20px; width: 100%;">
            <i class="fas fa-box-open fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
            <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد منتجات متاحة</h3>
            <p style="color: var(--gray-color);">سيتم إضافة المنتجات قريباً</p>
        </div>
    `;
    
    if (productsGrid) productsGrid.innerHTML = message;
    if (featuredGrid) featuredGrid.innerHTML = message;
}

// عرض المنتجات
function displayProducts(products = allProducts) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (products.length === 0) {
        displayNoProductsMessage();
        return;
    }
    
    productsGrid.innerHTML = products.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        const isInFavorites = favorites.some(f => f.id === product.id);
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                        ${product.originalPrice ? `<span class="original-price">${formatNumber(product.originalPrice)} ${siteCurrency}</span>` : ''}
                    </div>
                    <div class="product-stock">
                        <i class="fas fa-box"></i> المخزون: ${formatNumber(product.stock || 0)}
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-cart-plus"></i> أضف للسلة
                        </button>
                        <button class="action-btn favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// عرض المنتجات المميزة
function displayFeaturedProducts(filteredProducts = null) {
    const featuredGrid = document.getElementById('featuredProductsGrid');
    if (!featuredGrid) return;
    
    const productsToShow = filteredProducts || allProducts;
    
    if (productsToShow.length === 0) {
        displayNoProductsMessage();
        return;
    }
    
    featuredGrid.innerHTML = productsToShow.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-cart-plus"></i> أضف للسلة
                        </button>
                        <button class="action-btn favorite-btn" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// دالة الفلترة السريعة في الصفحة الرئيسية
function filterMainProducts(filterType, btn) {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.style.background = 'white';
        tab.style.color = 'black';
        tab.style.borderColor = '#ddd';
    });
    
    btn.style.background = 'var(--primary-color)';
    btn.style.color = 'white';
    btn.style.borderColor = 'var(--primary-color)';
    
    let filtered;
    if (filterType === 'all') {
        filtered = allProducts;
    } else {
        filtered = allProducts.filter(p => p[filterType] === true || p[filterType] === 'true');
    }
    
    displayFeaturedProducts(filtered);
}

// ======================== نافذة تحديد الكمية ========================

function openQuantityModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    selectedProductForQuantity = product;
    
    document.getElementById('quantityProductName').textContent = product.name;
    document.getElementById('selectedQuantity').value = 1;
    
    document.getElementById('quantityModal').classList.add('active');
}

function closeQuantityModal() {
    document.getElementById('quantityModal').classList.remove('active');
    selectedProductForQuantity = null;
}

function addToCartFromModal() {
    if (!selectedProductForQuantity) return;
    
    const quantity = parseInt(document.getElementById('selectedQuantity').value) || 1;
    addToCartWithQuantity(selectedProductForQuantity.id, quantity);
    closeQuantityModal();
}

function buyNowFromModal() {
    if (!selectedProductForQuantity) return;
    
    const quantity = parseInt(document.getElementById('selectedQuantity').value) || 1;
    buyNowDirect(selectedProductForQuantity.id, quantity);
    closeQuantityModal();
}

// ======================== إدارة السلة ========================

// إضافة منتج للسلة بكمية محددة
function addToCartWithQuantity(productId, quantity = 1) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showToast('المنتج غير متوفر في المخزون', 'warning');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${product.stock}`, 'warning');
        return;
    }
    
    const existingItem = cartItems.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            showToast(`لا توجد كمية كافية في المخزون. المتاح: ${product.stock - existingItem.quantity}`, 'warning');
            return;
        }
        existingItem.quantity += quantity;
    } else {
        cartItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            quantity: quantity,
            stock: product.stock
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartCount();
    
    const cartSection = document.getElementById('cart');
    if (cartSection && cartSection.classList.contains('active')) {
        updateCartDisplay();
    }
    
    showToast(`تمت إضافة ${quantity} من المنتج إلى السلة`, 'success');
}

// تحديث عدد العناصر في السلة
function updateCartCount() {
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });
}

// تحديث عرض السلة
function updateCartDisplay() {
    const cartItemsElement = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartSummary = document.querySelector('.cart-summary');
    
    if (!cartItemsElement || !emptyCartMessage) return;
    
    if (cartItems.length === 0) {
        cartItemsElement.style.display = 'none';
        emptyCartMessage.style.display = 'block';
        if (cartSummary) cartSummary.style.display = 'none';
        return;
    }
    
    cartItemsElement.style.display = 'flex';
    cartItemsElement.style.flexDirection = 'column';
    emptyCartMessage.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
    
    cartItemsElement.innerHTML = cartItems.map(item => {
        const totalPrice = item.price * item.quantity;
        
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/100x100?text=صورة'">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-price">${item.price} ${siteCurrency}</p>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                    <p class="cart-item-total">المجموع: ${totalPrice} ${siteCurrency}</p>
                </div>
            </div>
        `;
    }).join('');
    
    updateCartSummary();
}

// تحديث كمية المنتج في السلة
function updateCartQuantity(productId, change) {
    const item = cartItems.find(item => item.id === productId);
    if (!item) return;
    
    const product = allProducts.find(p => p.id === productId);
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > (product?.stock || item.stock || 99)) {
        showToast('لا توجد كمية كافية في المخزون', 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartCount();
    updateCartDisplay();
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    if (!confirm('هل تريد إزالة هذا المنتج من السلة؟')) return;
    
    cartItems = cartItems.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartCount();
    updateCartDisplay();
    showToast('تم إزالة المنتج من السلة', 'info');
}

// تحديث ملخص السلة
function updateCartSummary() {
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingCost = siteSettings.shippingCost || 15;
    const freeShippingLimit = siteSettings.freeShippingLimit || 200;
    
    let finalShippingCost = 0;
    if (subtotal > 0 && subtotal < freeShippingLimit) {
        finalShippingCost = shippingCost;
    }
    
    const total = subtotal + finalShippingCost;
    
    const subtotalElement = document.getElementById('cartSubtotal');
    const shippingCostElement = document.getElementById('shippingCost');
    const totalAmountElement = document.getElementById('totalAmount');
    const shippingNoteElement = document.getElementById('shippingNote');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (subtotalElement) subtotalElement.textContent = `${formatNumber(subtotal)} ${siteCurrency}`;
    if (shippingCostElement) shippingCostElement.textContent = `${formatNumber(finalShippingCost)} ${siteCurrency}`;
    if (totalAmountElement) totalAmountElement.textContent = `${formatNumber(total)} ${siteCurrency}`;
    
    if (shippingNoteElement) {
        if (subtotal > 0 && subtotal < freeShippingLimit) {
            const remaining = freeShippingLimit - subtotal;
            shippingNoteElement.innerHTML = `
                <i class="fas fa-truck"></i>
                أضف ${remaining} ${siteCurrency} أخرى للحصول على شحن مجاني
            `;
        } else if (subtotal >= freeShippingLimit) {
            shippingNoteElement.innerHTML = `
                <i class="fas fa-check-circle"></i>
                الشحن مجاني
            `;
        } else {
            shippingNoteElement.innerHTML = '';
        }
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = subtotal === 0;
    }
}

// تفريغ السلة
function clearCart() {
    if (cartItems.length === 0) return;
    
    if (confirm('هل تريد تفريغ السلة بالكامل؟')) {
        cartItems = [];
        localStorage.removeItem('cart');
        updateCartCount();
        updateCartDisplay();
        showToast('تم تفريغ السلة', 'info');
    }
}

// ======================== الشراء المباشر عبر واتساب ========================

function buyNowDirect(productId, quantity = 1) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showToast('المنتج غير متوفر في المخزون', 'warning');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`الكمية المطلوبة غير متوفرة. المخزون الحالي: ${product.stock}`, 'warning');
        return;
    }
    
    const shippingCost = siteSettings.shippingCost || 15;
    const freeShippingLimit = siteSettings.freeShippingLimit || 200;
    const subtotal = product.price * quantity;
    const finalShippingCost = subtotal < freeShippingLimit ? shippingCost : 0;
    const total = subtotal + finalShippingCost;
    
    const customerName = currentUser?.displayName || 'زائر';
    const phoneNumber = currentUser?.phone || 'غير محدد';
    
    const message = `🔸 OUD طلب جديد OUD🔸\n\n` +
                   `👤 العميل: ${customerName}\n` +
                   `📞 الهاتف: ${phoneNumber}\n` +
                   `📦 المنتج: ${product.name}\n` +
                   `🔢 الكمية: ${quantity}\n` +
                   `💰 سعر الوحدة: ${product.price} ${siteCurrency}\n` +
                   `💵 المجموع: ${subtotal} ${siteCurrency}\n` +
                   `🚚 رسوم الشحن: ${finalShippingCost} ${siteCurrency}\n` +
                   `💎 الإجمالي: ${formatNumber(total)} ${siteCurrency}\n\n` +
                   `📍 العنوان: ${currentUser?.address || 'سيتم تحديده لاحقاً'}\n` +
                   `📝 ملاحظات: ${quantity > 1 ? 'طلب كمية متعددة' : 'طلب فردي'}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = '249933002015';
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    // حفظ الطلب في Firestore
    try {
        if (db) {
            const orderData = {
                customerName: customerName,
                customerPhone: phoneNumber,
                address: currentUser?.address || 'سيتم تحديده لاحقاً',
                items: [{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: quantity
                }],
                subtotal: subtotal,
                shippingCost: finalShippingCost,
                total: total,
                status: 'pending',
                userId: currentUser?.uid || 'guest',
                createdAt: window.firebaseModules.serverTimestamp(),
                updatedAt: window.firebaseModules.serverTimestamp()
            };

            const ordersRef = window.firebaseModules.collection(db, "orders");
            window.firebaseModules.addDoc(ordersRef, orderData);
        }
    } catch (error) {
        console.error('❌ خطأ في حفظ الطلب المباشر:', error);
    }

    window.open(whatsappURL, '_blank');
    showToast('تم إرسال طلبك وحفظه بنجاح', 'success');
}

// إتمام الشراء عبر واتساب للسلة كاملة
function checkoutToWhatsApp() {
    if (cartItems.length === 0) {
        showToast('السلة فارغة', 'warning');
        return;
    }
    
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shippingCost = siteSettings.shippingCost || 15;
    const freeShippingLimit = siteSettings.freeShippingLimit || 200;
    const finalShippingCost = subtotal < freeShippingLimit ? shippingCost : 0;
    const total = subtotal + finalShippingCost;
    
    const customerName = currentUser?.displayName || 'زائر';
    const phoneNumber = currentUser?.phone || 'غير محدد';
    
    let message = `🔸 OUD طلب جديد OUD🔸\n\n` +
                  `👤 العميل: ${customerName}\n` +
                  `📞 الهاتف: ${phoneNumber}\n\n` +
                  `🛒 محتويات الطلب:\n`;
    
    cartItems.forEach((item, index) => {
        message += `${index + 1}. ${item.name} - ${item.quantity} × ${formatNumber(item.price)} ${siteCurrency} = ${formatNumber(item.price * item.quantity)} ${siteCurrency}\n`;
    });
    
    message += `\n💰 المجموع الفرعي: ${subtotal} ${siteCurrency}\n` +
               `🚚 رسوم الشحن: ${finalShippingCost} ${siteCurrency}\n` +
               `💎 الإجمالي: ${formatNumber(total)} ${siteCurrency}\n\n` +
               `📍 العنوان: ${currentUser?.address || 'سيتم تحديده لاحقاً'}\n` +
               `📝 عدد المنتجات: ${cartItems.length} منتج`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = '249933002015';
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    // حفظ الطلب في Firestore
    try {
        if (db) {
            const orderData = {
                customerName: customerName,
                customerPhone: phoneNumber,
                address: currentUser?.address || 'سيتم تحديده لاحقاً',
                items: cartItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                subtotal: subtotal,
                shippingCost: finalShippingCost,
                total: total,
                status: 'pending',
                userId: currentUser?.uid || 'guest',
                createdAt: window.firebaseModules.serverTimestamp(),
                updatedAt: window.firebaseModules.serverTimestamp()
            };

            const ordersRef = window.firebaseModules.collection(db, "orders");
            window.firebaseModules.addDoc(ordersRef, orderData);
        }
    } catch (error) {
        console.error('❌ خطأ في حفظ الطلب:', error);
    }

    window.open(whatsappURL, '_blank');
    
    cartItems = [];
    localStorage.removeItem('cart');
    updateCartCount();
    updateCartDisplay();
    
    showToast('تم إرسال طلبك وحفظه بنجاح', 'success');
}

// ======================== المفضلة ========================

// تبديل حالة المفضلة
function toggleFavorite(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const index = favorites.findIndex(f => f.id === productId);
    
    if (index === -1) {
        favorites.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category
        });
        showToast('تم إضافة المنتج إلى المفضلة', 'success');
    } else {
        favorites.splice(index, 1);
        showToast('تم إزالة المنتج من المفضلة', 'info');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    if (document.getElementById('favorites').classList.contains('active')) {
        updateFavoritesDisplay();
    }
    
    updateFavoriteIcons();
    updateProfileStats();
}

// تحديث أيقونات القلب في المنتجات
function updateFavoriteIcons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (!onclickAttr) return;
        
        const match = onclickAttr.match(/'([^']+)'/);
        if (!match) return;
        
        const productId = match[1];
        const isFavorite = favorites.some(f => f.id === productId);
        
        if (isFavorite) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// عرض المفضلة
function updateFavoritesDisplay() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const emptyFavoritesMessage = document.getElementById('emptyFavoritesMessage');
    
    if (!favoritesGrid || !emptyFavoritesMessage) return;
    
    if (favorites.length === 0) {
        favoritesGrid.style.display = 'none';
        emptyFavoritesMessage.style.display = 'block';
        return;
    }
    
    favoritesGrid.style.display = 'grid';
    emptyFavoritesMessage.style.display = 'none';
    
    favoritesGrid.innerHTML = favorites.map(product => {
        return `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-cart-plus"></i> أضف للسلة
                        </button>
                        <button class="action-btn favorite-btn active" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ======================== البحث والفلاتر ========================

// البحث عن منتجات
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        displayProducts();
        return;
    }
    
    const filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
    );
    
    displayFilteredProducts(filteredProducts);
    showSection('products');
}

// تطبيق الفلاتر
function filterProducts() {
    let filteredProducts = [...allProducts];
    
    const category = document.getElementById('categoryFilter')?.value;
    if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
    }
    
    const sortBy = document.getElementById('sortFilter')?.value;
    if (sortBy === 'price-low') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
        filteredProducts.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    const activeFilters = Array.from(document.querySelectorAll('.filter-btn.active'));
    activeFilters.forEach(btn => {
        const filterType = btn.getAttribute('data-filter');
        if (filterType === 'isNew') {
            filteredProducts = filteredProducts.filter(p => p.isNew === true || p.isNew === 'true');
        } else if (filterType === 'isSale') {
            filteredProducts = filteredProducts.filter(p => p.isSale === true || p.isSale === 'true');
        } else if (filterType === 'isBest') {
            filteredProducts = filteredProducts.filter(p => p.isBest === true || p.isBest === 'true');
        }
    });
    
    displayFilteredProducts(filteredProducts);
}

// عرض المنتجات بعد الفلترة
function displayFilteredProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<p class="no-products">لا توجد منتجات تطابق معايير البحث</p>';
        return;
    }
    
    productsGrid.innerHTML = products.map(product => {
        const isNew = product.isNew === true || product.isNew === 'true';
        const isSale = product.isSale === true || product.isSale === 'true';
        const isBest = product.isBest === true || product.isBest === 'true';
        const isInFavorites = favorites.some(f => f.id === product.id);
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=صورة'">
                    ${isNew ? '<div class="badge new">جديد</div>' : ''}
                    ${isSale ? '<div class="badge sale">عرض</div>' : ''}
                    ${isBest ? '<div class="badge best">الأفضل</div>' : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-price">
                        <span class="current-price">${formatNumber(product.price)} ${siteCurrency}</span>
                        ${product.originalPrice ? `<span class="original-price">${formatNumber(product.originalPrice)} ${siteCurrency}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" onclick="openQuantityModal('${product.id}')">
                            <i class="fas fa-cart-plus"></i> أضف للسلة
                        </button>
                        <button class="action-btn favorite-btn ${isInFavorites ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ======================== الملف الشخصي ========================

// تحديث الملف الشخصي
function updateUserProfile() {
    if (!currentUser) return;
    
    const savedUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    const userName = currentUser.displayName || savedUser.displayName || savedUser.name || 'زائر';
    const userEmail = currentUser.email || savedUser.email || 'ليس لديك حساب';
    
    const elements = [
        { id: 'profileName', text: userName },
        { id: 'mobileUserName', text: userName },
        { id: 'profileEmail', text: userEmail },
        { id: 'mobileUserEmail', text: userEmail },
        { id: 'detailName', text: userName },
        { id: 'detailEmail', text: userEmail }
    ];
    
    elements.forEach(el => {
        const element = document.getElementById(el.id);
        if (element) element.textContent = el.text;
    });
    
    if (currentUser.photoURL) {
        const images = document.querySelectorAll('#profileImage, #mobileUserImage');
        images.forEach(img => {
            img.src = currentUser.photoURL;
        });
    }
    
    updateProfileStats();
}

// تحديث إحصائيات الملف الشخصي
async function updateProfileStats() {
    const favoritesCount = favorites.length;
    document.getElementById('favoritesCount').textContent = favoritesCount;
    
    let ordersCount = 0;
    let totalSpent = 0;
    
    if (isGuest) {
        const orders = JSON.parse(localStorage.getItem('orders')) || [];
        ordersCount = orders.length;
        totalSpent = orders.reduce((total, order) => total + (order.total || 0), 0);
    } else if (db && currentUser) {
        try {
            const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
            const userDoc = await window.firebaseModules.getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                ordersCount = userData.totalOrders || 0;
                totalSpent = userData.totalSpent || 0;
            }
        } catch (error) {
            console.error('خطأ في تحميل إحصائيات المستخدم:', error);
        }
    }
    
    document.getElementById('ordersCount').textContent = ordersCount;
    document.getElementById('totalSpent').textContent = totalSpent;
}

// تحرير الملف الشخصي
function editProfile() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    document.getElementById('editName').value = currentUser?.displayName || '';
    document.getElementById('editPhone').value = '';
    document.getElementById('editAddress').value = '';
    
    modal.classList.add('active');
}

// حفظ تعديلات الملف الشخصي
async function saveProfileChanges() {
    const name = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;
    const address = document.getElementById('editAddress').value;
    
    if (!name.trim()) {
        showToast('الرجاء إدخال الاسم', 'warning');
        return;
    }
    
    try {
        if (!isGuest && currentUser && db) {
            await window.firebaseModules.updateProfile(currentUser, { displayName: name });
            
            const userRef = window.firebaseModules.doc(db, "users", currentUser.uid);
            await window.firebaseModules.updateDoc(userRef, {
                name: name,
                phone: phone,
                address: address,
                updatedAt: window.firebaseModules.serverTimestamp()
            });
        }
        
        currentUser.displayName = name;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        updateUserProfile();
        
        document.getElementById('editProfileModal').classList.remove('active');
        showToast('تم تحديث الملف الشخصي بنجاح', 'success');
        
    } catch (error) {
        console.error('خطأ في تحديث الملف الشخصي:', error);
        showToast('حدث خطأ في تحديث الملف الشخصي', 'error');
    }
}

// ======================== إعدادات الموقع ========================

// تحميل إعدادات الموقع
async function loadSiteConfig() {
    try {
        if (!db) return;
        
        const configRef = window.firebaseModules.doc(db, "settings", "site_config");
        const configSnap = await window.firebaseModules.getDoc(configRef);
        
        if (configSnap.exists()) {
            siteSettings = configSnap.data();
            siteCurrency = siteSettings.currency || 'SDG ';
            updateUIWithSettings();
        }
    } catch (error) {
        console.error('خطأ في تحميل إعدادات الموقع:', error);
    }
}

// تحديث واجهة المستخدم بالإعدادات
function updateUIWithSettings() {
    if (!siteSettings) return;
    
    if (siteSettings.storeName) {
        document.getElementById('dynamicTitle').textContent = siteSettings.storeName + ' - متجر العطور ومستحضرات التجميل';
        
        const storeNameElements = [
            document.getElementById('siteStoreName'),
            document.getElementById('footerStoreName')
        ];
        
        storeNameElements.forEach(el => {
            if (el) el.textContent = siteSettings.storeName;
        });
    }
    
    const footerElements = {
        'footerEmail': 'email',
        'footerPhone': 'phone',
        'footerAddress': 'address',
        'footerHours': 'workingHours'
    };
    
    for (const [elementId, settingKey] of Object.entries(footerElements)) {
        const element = document.getElementById(elementId);
        if (element && siteSettings[settingKey]) {
            element.textContent = siteSettings[settingKey];
        }
    }
    
    const aboutEl = document.getElementById('storeDescription');
    if (aboutEl && siteSettings.aboutUs) {
        aboutEl.textContent = siteSettings.aboutUs;
    }
    
    const socialContainer = document.querySelector('.footer-social') || document.querySelector('.social-links');
    if (socialContainer) {
        let socialHTML = '';
        if (siteSettings.whatsappUrl) socialHTML += `<a href="${siteSettings.whatsappUrl}" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>`;
        if (siteSettings.instagramUrl) socialHTML += `<a href="${siteSettings.instagramUrl}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>`;
        if (siteSettings.facebookUrl) socialHTML += `<a href="${siteSettings.facebookUrl}" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>`;
        if (siteSettings.tiktokUrl) socialHTML += `<a href="${siteSettings.tiktokUrl}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
        
        if (socialHTML) socialContainer.innerHTML = socialHTML;
    }

    if (siteSettings.logoUrl) {
        const logoElements = [
            document.getElementById('siteLogo'),
            document.getElementById('authLogo'),
            document.getElementById('footerLogo')
        ];
        
        logoElements.forEach(el => {
            if (el) el.src = siteSettings.logoUrl;
        });
    }
}

// ======================== إدارة الأحداث ========================

// إعداد جميع المستمعين للأحداث
function setupAllEventListeners() {
    console.log('⚙️ إعداد جميع الأحداث...');
    
    setupAuthEventListeners();
    setupNavigationEventListeners();
    setupAppEventListeners();
    setupModalEventListeners();
    setupQuantityModalEvents();
    
    console.log('✅ جميع الأحداث جاهزة');
}

// إعداد أحداث المصادقة
function setupAuthEventListeners() {
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', signInWithGoogle);
    }
    
    const emailBtn = document.getElementById('emailSignInBtn');
    if (emailBtn) {
        emailBtn.addEventListener('click', showEmailAuthForm);
    }
    
    const guestBtn = document.getElementById('guestSignInBtn');
    if (guestBtn) {
        guestBtn.addEventListener('click', signInAsGuest);
    }
    
    const backBtn = document.getElementById('backToAuthOptions');
    if (backBtn) {
        backBtn.addEventListener('click', hideEmailAuthForm);
    }
    
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const email = document.getElementById('emailInput')?.value || '';
                const password = passwordInput.value;
                if (email && password) {
                    signInWithEmail(email, password);
                }
            }
        });
    }
}

// إعداد أحداث التنقل
function setupNavigationEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    const closeMenu = document.getElementById('closeMenu');
    const mobileNav = document.getElementById('mobileNav');
    
    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', () => mobileNav.classList.add('active'));
    }
    
    if (closeMenu && mobileNav) {
        closeMenu.addEventListener('click', () => mobileNav.classList.remove('active'));
    }
    
    document.querySelectorAll('a[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
            
            if (mobileNav) mobileNav.classList.remove('active');
        });
    });
    
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', signOutUser);
    }
}

// إعداد أحداث التطبيق
function setupAppEventListeners() {
    const buttons = {
        'shopNowBtn': () => showSection('products'),
        'continueShoppingBtn': () => showSection('products'),
        'browseProductsBtn': () => showSection('products'),
        'homeBtn': () => showSection('home'),
        'cartBtn': () => showSection('cart'),
        'favoritesBtn': () => showSection('favorites'),
        'profileBtn': () => showSection('profile'),
        'logoutBtn': signOutUser,
        'checkoutBtn': checkoutToWhatsApp,
        'editProfileBtn': editProfile,
        'saveProfileBtn': saveProfileChanges,
        'clearCartBtn': clearCart,
        'adminBtn': () => {
            console.log('🛠️ فتح لوحة التحكم...');
            window.open('admin.html', '_blank');
        }
    };
    
    for (const [btnId, action] of Object.entries(buttons)) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', action);
        }
    }
    
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', filterProducts);
    }
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
            filterProducts();
        });
    });
}

// إعداد أحداث النوافذ المنبثقة
function setupModalEventListeners() {
    document.querySelectorAll('.close-modal, .btn-secondary.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// إعداد أحداث نافذة الكمية
function setupQuantityModalEvents() {
    const increaseBtn = document.getElementById('increaseQuantity');
    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            const input = document.getElementById('selectedQuantity');
            let value = parseInt(input.value) || 1;
            if (value < 99) {
                input.value = value + 1;
            }
        });
    }
    
    const decreaseBtn = document.getElementById('decreaseQuantity');
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            const input = document.getElementById('selectedQuantity');
            let value = parseInt(input.value) || 1;
            if (value > 1) {
                input.value = value - 1;
            }
        });
    }
    
    const quantityInput = document.getElementById('selectedQuantity');
    if (quantityInput) {
        quantityInput.addEventListener('change', function() {
            let value = parseInt(this.value) || 1;
            if (value < 1) value = 1;
            if (value > 99) value = 99;
            this.value = value;
        });
    }
    
    const addToCartBtn = document.getElementById('addToCartFromModal');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', addToCartFromModal);
    }
    
    const buyNowBtn = document.getElementById('buyNowFromModal');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', buyNowFromModal);
    }
}

// ======================== أحداث التسجيل ========================

function setupRegistrationEventListeners() {
    const signUpBtn = document.getElementById('signUpBtn');
    if (signUpBtn) {
        signUpBtn.addEventListener('click', showRegistrationForm);
    }
    
    const completeSignUpBtn = document.getElementById('completeSignUpBtn');
    if (completeSignUpBtn) {
        completeSignUpBtn.addEventListener('click', handleRegistration);
    }
    
    const switchToLoginBtn = document.getElementById('switchToLoginBtn');
    if (switchToLoginBtn) {
        switchToLoginBtn.addEventListener('click', showLoginForm);
    }
    
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', handleLogin);
    }
    
    const registerPassword = document.getElementById('registerPassword');
    if (registerPassword) {
        registerPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleRegistration();
            }
        });
    }
}

function showRegistrationForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        const formHeader = emailAuthForm.querySelector('.form-header h2');
        if (formHeader) formHeader.textContent = 'إنشاء حساب جديد';
        
        const loginFields = document.getElementById('loginFields');
        const registerFields = document.getElementById('registerFields');
        
        if (loginFields) loginFields.style.display = 'none';
        if (registerFields) registerFields.style.display = 'block';
        
        emailAuthForm.style.display = 'block';
        
        const registerName = document.getElementById('registerName');
        if (registerName) registerName.focus();
    }
}

function showLoginForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        const formHeader = emailAuthForm.querySelector('.form-header h2');
        if (formHeader) formHeader.textContent = 'تسجيل الدخول';
        
        const loginFields = document.getElementById('loginFields');
        const registerFields = document.getElementById('registerFields');
        
        if (loginFields) loginFields.style.display = 'block';
        if (registerFields) registerFields.style.display = 'none';
        
        const emailInput = document.getElementById('emailInput');
        if (emailInput) emailInput.focus();
    }
}

async function handleRegistration() {
    const name = document.getElementById('registerName')?.value || '';
    const email = document.getElementById('registerEmail')?.value || '';
    const password = document.getElementById('registerPassword')?.value || '';
    const phone = document.getElementById('registerPhone')?.value || '';
    
    if (!name || !email || !password) {
        showAuthMessage('الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAuthMessage('البريد الإلكتروني غير صالح', 'error');
        return;
    }
    
    showAuthMessage('جاري إنشاء حسابك...', 'info');
    
    const success = await signUpWithEmail(email, password, name, phone);
    
    if (success) {
        showAuthMessage('تم إنشاء حسابك بنجاح!', 'success');
    }
}

async function handleLogin() {
    const email = document.getElementById('emailInput')?.value || '';
    const password = document.getElementById('passwordInput')?.value || '';
    
    if (!email || !password) {
        showAuthMessage('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }
    
    showAuthMessage('جاري تسجيل الدخول...', 'info');
    
    await signInWithEmail(email, password);
}

// ======================== دوال الواجهة ========================

// إعداد الهيدر الذكي وزر العودة للأعلى
function setupSmartHeader() {
    const header = document.querySelector('.header');
    const backToTopBtn = document.getElementById('backToTop');
    if (!header) return;

    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        if (backToTopBtn) {
            if (scrollTop > 500) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });
    
    header.style.transition = 'transform 0.3s ease-in-out';
    
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// عرض/إخفاء شاشة المصادقة
function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (authScreen) {
        authScreen.style.setProperty('display', 'flex', 'important');
    }
    if (appContainer) {
        appContainer.style.setProperty('display', 'none', 'important');
    }
}

function showMainApp() {
    const authScreen = document.getElementById('authScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (authScreen) {
        authScreen.style.setProperty('display', 'none', 'important');
    }
    if (appContainer) {
        appContainer.style.setProperty('display', 'flex', 'important');
    }
}

// عرض/إخفاء نموذج البريد
function showEmailAuthForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        emailAuthForm.style.display = 'block';
        showLoginForm();
    }
}

function hideEmailAuthForm() {
    const emailAuthForm = document.getElementById('emailAuthForm');
    if (emailAuthForm) {
        emailAuthForm.style.display = 'none';
        clearEmailForm();
    }
}

function clearEmailForm() {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const authMessage = document.getElementById('emailAuthMessage');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }
}

function showAuthMessage(message, type = 'error') {
    const authMessage = document.getElementById('emailAuthMessage');
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }
}

// عرض الأقسام
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        switch(sectionId) {
            case 'cart':
                updateCartDisplay();
                break;
            case 'favorites':
                updateFavoritesDisplay();
                break;
            case 'profile':
                updateProfileStats();
                break;
        }
    }
}

// الإشعارات
function showToast(message, type = 'info') {
    const now = Date.now();
    if (now - lastToastTime < 1000) return;
    lastToastTime = now;
    
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'error') icon = 'exclamation-circle';
    else if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ضبط تنسيق الصفحة
function adjustLayout() {
    const headerContent = document.querySelector('.header-content');
    if (headerContent) {
        headerContent.style.display = 'grid';
        headerContent.style.gridTemplateColumns = 'auto 1fr auto';
        headerContent.style.alignItems = 'center';
        headerContent.style.gap = '15px';
        headerContent.style.padding = '15px 20px';
    }
    
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.style.width = '300px';
        searchContainer.style.margin = '0';
    }
    
    const productsGrid = document.querySelector('.products-grid');
    if (productsGrid) {
        productsGrid.style.display = 'grid';
        productsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        productsGrid.style.gap = '25px';
        productsGrid.style.margin = '0';
    }
}

// ======================== بدء التطبيق ========================

// بدء التطبيق بشكل آمن
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 بدء تحميل التطبيق...');
    
    // التأكد من أن شاشة التحميل مرئية
    const loader = document.getElementById('initialLoader');
    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
    }
    
    // ضبط التنسيق أولاً
    adjustLayout();
    
    // بدء التطبيق بعد تأخير قصير للتأكد من تحميل Firebase SDK
    setTimeout(() => {
        initializeAppSafely();
    }, 100);
});

// إضافة مستمع حدث عند اكتمال تحميل الصفحة
window.addEventListener('load', function() {
    console.log('📄 الصفحة تم تحميلها بالكامل');
    setTimeout(() => {
        const loader = document.getElementById('initialLoader');
        if (loader && loader.style.display !== 'none') {
            console.log('⚠️ شاشة التحميل لا تزال ظاهرة، إخفاء قسري...');
            forceHideLoader();
        }
    }, 2000);
});

// معالج أخطاء تحميل الصفحة
window.addEventListener('error', function(e) {
    console.error('❌ خطأ في تحميل الصفحة:', e);
    forceHideLoader();
});

// ======================== التصدير للاستخدام في HTML ========================

window.addToCart = addToCartWithQuantity;
window.openQuantityModal = openQuantityModal;
window.closeQuantityModal = closeQuantityModal;
window.addToCartFromModal = addToCartFromModal;
window.buyNowFromModal = buyNowFromModal;
window.toggleFavorite = toggleFavorite;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.signInAsGuest = signInAsGuest;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.showSection = showSection;
window.clearCart = clearCart;
window.editProfile = editProfile;
window.saveProfileChanges = saveProfileChanges;
window.performSearch = performSearch;
window.filterProducts = filterProducts;
window.checkoutToWhatsApp = checkoutToWhatsApp;
window.buyNowDirect = buyNowDirect;
window.signUpWithEmail = signUpWithEmail;
window.handleRegistration = handleRegistration;
window.handleLogin = handleLogin;
window.showRegistrationForm = showRegistrationForm;
window.showLoginForm = showLoginForm;
window.filterMainProducts = filterMainProducts;
window.hideLoader = hideLoader;

// استدعاء ضبط التنسيق عند تغيير حجم النافذة
window.addEventListener('resize', adjustLayout);

console.log('🚀 تطبيق Queen Beauty جاهز للعمل!');
