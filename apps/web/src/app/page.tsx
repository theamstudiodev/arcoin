import {redirect} from 'next/navigation';

// Week 1 has one screen. The portfolio board becomes home in week 2.
export default function Home() {
  redirect('/people');
}
