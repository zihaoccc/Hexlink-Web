import {
    getAuth,
    GoogleAuthProvider,
    TwitterAuthProvider,
    signInWithPopup,
    signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import type { IUser } from "@/types";
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/services/firebase'
import { useAuthStore } from "@/stores/auth"
import { genNameHash, buildAccount } from '@/services/web3/account'

const auth = getAuth(app)
const functions = getFunctions()

export async function getIdTokenAndSetClaimsIfNecessary(user: User, refresh: boolean = false) {
    let idToken = await user.getIdToken(refresh)
    const idTokenResult = await user.getIdTokenResult()
    if (!idTokenResult.claims['https://hasura.io/jwt/claims']) {
        const refreshToken = httpsCallable(functions, 'refreshToken')
        try {
            await refreshToken()
            idToken = await user.getIdToken(true)
        } catch (error: any) {
            console.error(
                "Unable to refresh token, which doesn't have Hasura claim.",
            )
            signOutFirebase()
            throw(error)
        }
    }
    return idToken
}

export async function refreshToken() {
    const idToken = await getIdTokenAndSetClaimsIfNecessary(auth.currentUser!, true);
    const store = useAuthStore();
    store.refreshIdToken(idToken);
}

export async function googleSocialLogin() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider)
        const idToken = await getIdTokenAndSetClaimsIfNecessary(result.user)
        const nameHash = await genNameHash("mailto", result.user.email!);
        const account = await buildAccount(nameHash);
        const user : IUser = {
            provider: "google",
            uid: result.user.uid,
            handle: result.user.email!,
            displayName: result.user.displayName || undefined,
            photoURL: result.user.photoURL || undefined,
            nameHash,
            account
        }
        const store = useAuthStore();
        store.signIn(user, idToken);
    } catch (error: any) {
        if (error.code == 'auth/popup-closed-by-user') {
            return
        }
    }
}

export async function twitterSocialLogin() {
    const provider = new TwitterAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const idToken = await getIdTokenAndSetClaimsIfNecessary(result.user);
        const uid = result.user.providerData[0].uid;
        const nameHash = await genNameHash("twitter.com", uid);
        const account = await buildAccount(nameHash);
        const user : IUser = {
            provider: "twitter.com",
            uid,
            handle: result.user.reloadUserInfo.screenName,
            displayName: result.user.displayName || undefined,
            photoURL: result.user.photoURL || undefined,
            nameHash,
            account
        }
        const store = useAuthStore();
        store.signIn(user, idToken);
    } catch (error) {
        console.log(error);
    }
}

export function signOutFirebase() {
    return signOut(auth)
}
