import { useEffect, useState } from 'react';
import Brandmark from './components/Brandmark';
import './styles.css';

const products = [
  ['X39', 'Signature wellness patch'],
  ['X49', 'Active lifestyle'],
  ['Aeon', 'Balance · Rest'],
  ['IceWave', 'Everyday comfort'],
  ['Glutathione', 'Wellness support'],
  ['Carnosine', 'Daily performance'],
  ['SP6 Complete', 'Wellness routine'],
  ['Energy Enhancer', 'Energy · Activity'],
  ['Silent Nights', 'Nighttime routine'],
  ['Alavida', 'Beauty · Wellness'],
  ['Cellergize', 'Everyday wellness'],
  ['X2O', 'Water · Wellness technology'],
] as const;

const sections = [
  {
    id: 'about',
    kicker: 'About',
    title: (
      <>
        도움을 연결하는
        <br />
        작은 플랫폼.
      </>
    ),
    text: (
      <>
        AUXILIA는 사람과 기술을 연결해 새로운 웰니스 정보를 이해하기 쉽게
        전달하는 공간입니다. 처음부터 많은 설명을 하기보다, 필요한 만큼 천천히
        알아갈 수 있도록 설계합니다.
        <div className="rule" />
        <strong>화면 전체를 한 장의 명함처럼.</strong>
        <br />
        장식은 줄이고, 여백과 타이포그래피가 중심이 되는 인상을 목표로 합니다.
      </>
    ),
    cards: [
      ['People', '사람의 관심과 상황에서 시작합니다.'],
      ['Technology', '낯선 기술을 차분하고 명료하게 풀어냅니다.'],
      ['Wellness', '과장보다 일상적인 선택과 이해를 돕습니다.'],
    ],
  },
  {
    id: 'lifewave',
    kicker: 'LifeWave',
    title: (
      <>
        익숙한 방식과
        <br />
        다른 접근.
      </>
    ),
    text: (
      <>
        LifeWave의 대표 제품은 피부에 붙여 사용하는 비경피성 패치입니다.
        영양제를 섭취하거나, 주사로 투여하거나, 일반 경피제품처럼 성분을 피부로
        전달하는 방식과는 다른 접근으로 소개됩니다.
        <div className="rule" />
        공개 사이트에서는 효능을 단정하기보다 제품의 구조와 기술적 차이를 먼저
        설명하는 방향으로 구성합니다.
      </>
    ),
  },
] as const;

function useEdgeUi() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => {
      setActive(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.scrollY < 60) setActive(false);
      }, 2200);
    };
    const mousemove = (event: MouseEvent) => {
      const mouseX = (event.clientX / window.innerWidth) * 100;
      const mouseY = (event.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--light-x', `${mouseX}%`);
      document.documentElement.style.setProperty('--light-y', `${mouseY}%`);
      document.documentElement.style.setProperty(
        '--light-x-inverse',
        `${100 - mouseX}%`
      );
      document.documentElement.style.setProperty(
        '--light-y-inverse',
        `${100 - mouseY}%`
      );
      const nearEdge =
        event.clientY < 92 ||
        event.clientX < 92 ||
        event.clientX > window.innerWidth - 92;
      if (nearEdge) reveal();
    };
    const scroll = () => setActive(window.scrollY > 18);
    window.addEventListener('mousemove', mousemove);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', mousemove);
      window.removeEventListener('scroll', scroll);
      if (timer) clearTimeout(timer);
    };
  }, []);
  return active;
}

function useSectionReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        }),
      { threshold: 0.12 }
    );
    document
      .querySelectorAll('.section')
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
}

function useHasScrolled() {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 0);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return hasScrolled;
}

const App = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const edgeActive = useEdgeUi();
  const hasScrolled = useHasScrolled();
  useSectionReveal();
  return (
    <>
      <div className={`edge-ui${edgeActive ? ' edge-active' : ''}`}>
        <header className="topbar">
          <a className="mini" href="#top">
            AUXILIA
          </a>
          <nav aria-label="Main navigation">
            {['about', 'lifewave', 'products', 'survey', 'business'].map(
              (item) => (
                <a href={`#${item}`} key={item}>
                  {item.toUpperCase()}
                </a>
              )
            )}
          </nav>
          <button onClick={() => setLoginOpen(true)} type="button">
            LOGIN
          </button>
        </header>
        <div className="side-note">PEOPLE · TECHNOLOGY · WELLNESS</div>
      </div>
      <section className="hero" id="top">
        <Brandmark />
        <div className={`hero-hint${hasScrolled ? ' is-hidden' : ''}`}>
          scroll or move to the edge
        </div>
      </section>
      <main className="content shell">
        {sections.map((section) => (
          <section className="section" id={section.id} key={section.id}>
            <div className="section-grid">
              <div>
                <div className="kicker">{section.kicker}</div>
                <h2>{section.title}</h2>
              </div>
              <div className="bodycopy">{section.text}</div>
            </div>
            {'cards' in section && (
              <div className="cards">
                {section.cards.map(([title, text]) => (
                  <div className="card" key={title}>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
        <section className="section" id="products">
          <div className="section-grid">
            <div>
              <div className="kicker">Products</div>
              <h2>
                주요 제품을
                <br />
                간결하게.
              </h2>
            </div>
            <div className="bodycopy">
              LifeWave의 주요 제품군을 한눈에 보여주고, 각 제품의 세부 설명은
              별도 페이지로 확장합니다.
            </div>
          </div>
          <div className="product-list">
            {products.map(([name, meta]) => (
              <article className="product" key={name}>
                <div className="name">{name}</div>
                <div className="meta">{meta}</div>
              </article>
            ))}
          </div>
        </section>
        <section className="section" id="survey">
          <div className="section-grid">
            <div>
              <div className="kicker">Survey</div>
              <h2>
                당신에게 맞는
                <br />
                관심사를 먼저.
              </h2>
              <div className="bodycopy survey-description">
                몇 개의 간단한 질문을 통해 관심 제품 후보를 제안하는 흐름입니다.
                의료 진단이 아니라 관심사 기반 정보 탐색 도구로 설계합니다.
              </div>
            </div>
            <div className="survey-box">
              <div className="question">
                요즘 가장 관심 있는 것은 무엇인가요?
              </div>
              <div className="choices">
                {['활력', '편안한 휴식', '수면', '운동', '피부'].map(
                  (choice) => (
                    <button className="choice" key={choice} type="button">
                      {choice}
                    </button>
                  )
                )}
              </div>
              <button
                className="cta"
                onClick={() => setResultVisible(true)}
                type="button"
              >
                추천 예시 보기
              </button>
              {resultVisible && (
                <div className="survey-result">
                  예시 결과: X39 · Aeon · Alavida
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="section" id="business">
          <div className="section-grid">
            <div>
              <div className="kicker">Business</div>
              <h2>
                제품에서 시작해
                <br />
                선택에 따라 확장.
              </h2>
            </div>
            <div className="business-flow">
              {[
                [
                  '01',
                  '제품을 먼저 이해',
                  '관심 제품과 사용 방식을 먼저 확인합니다.',
                ],
                [
                  '02',
                  '구매 방식 선택',
                  '일반 구매 · 정기구매 · 업그레이드 팩 등 현재 조건에 맞게 안내합니다.',
                ],
                [
                  '03',
                  '브랜드 파트너',
                  '제품을 소개하거나 사업으로 확장하고 싶은 경우 별도 안내로 연결합니다.',
                ],
                [
                  '04',
                  '투명한 판매 방식 안내',
                  '국내에서는 다단계판매 방식으로 운영된다는 점을 숨기지 않고 설명합니다.',
                ],
              ].map(([number, title, text]) => (
                <div className="step" key={number}>
                  <div className="num">{number}</div>
                  <div>
                    <b>{title}</b>
                    <span>{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div className="shell footer-grid">
          <div>
            <div className="footer-brand">AUXILIA</div>
            <div>People · Technology · Wellness</div>
          </div>
          <div className="footer-notice">
            AUXILIA는 LifeWave 공식 웹사이트가 아닌 독립적인 안내용
            프로토타입입니다.
            <br />
            실제 공개 전 제품·사업 관련 문구는 공식 자료와 현재 정책 기준으로
            검토해야 합니다.
          </div>
        </div>
      </footer>
      {loginOpen && (
        <div
          aria-modal="true"
          className="modal open"
          onClick={() => setLoginOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setLoginOpen(false);
          }}
          role="dialog"
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Login</h3>
            <p>UI prototype only</p>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" placeholder="name@example.com" type="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" placeholder="••••••••" type="password" />
            </div>
            <button
              className="cta"
              onClick={() =>
                window.alert('인증 백엔드는 아직 연결되지 않았습니다.')
              }
              type="button"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
