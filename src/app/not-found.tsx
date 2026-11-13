import Link from "next/link";
export default function NotFound() {
  return <section className="empty-state"><h1>페이지를 찾을 수 없습니다</h1><Link className="button" href="/">Dashboard로</Link></section>;
}
