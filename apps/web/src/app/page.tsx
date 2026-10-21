import {redirect} from 'next/navigation';

// The portfolio board is home: the four tiers are what the partners open the app to see.
export default function Home() {
  redirect('/projects');
}
