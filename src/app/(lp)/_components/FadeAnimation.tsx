import { ReactNode } from "react";
import { useInView } from "react-intersection-observer";

type Props = {
  children: ReactNode;
};

export const FadeAnimation: React.FC<Props> = (props) => {
  const { children } = props;

  /**
   * スクロールイベントのオプション
   * 「ref」検知する要素
   * 「inView」要素が見えたかどうか(見えたらtrue)
   * 「rootMargin」要素の検知の「余白」を設定
   * 「triggerOnce」検知を一度だけ行うかどうか
   */
  const { ref, inView } = useInView({
    rootMargin: "-100px",
    triggerOnce: true,
  });

  return (
    <div
      ref={ref}
      className={`${inView ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"} transition-all duration-500 ease-in-out`}
    >
      {children}
    </div>
  );
};
