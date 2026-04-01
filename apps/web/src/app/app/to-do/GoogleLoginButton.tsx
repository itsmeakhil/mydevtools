// components/GoogleLoginButton.js
'use client';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../../database/firebase';
import { Button } from '../../../components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const GoogleLoginButton = () => {
    const router = useRouter();
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('User signed in:', result.user);
      router.push('/dashboard'); // Redirect to the home page or any other page
      // Redirect or handle user data
    } catch (error) {
      console.error('Error during Google sign-in:', error);
    }
  };

  return (
    <div className='flex justify-center items-center'>
  <Button  variant="secondary" onClick={signInWithGoogle}>
  <Image src="/7123025_logo_google_g_icon.svg" alt="Google Icon" width={20} height={20} />
  Sign-In with Google
</Button>
</div>
  );


};

export default GoogleLoginButton;

