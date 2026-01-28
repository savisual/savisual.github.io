// data 로드
async function loadWorks() {
  const res = await fetch("/data/works.json");
  if (!res.ok) throw new Error("works.json 로드 실패");
  return await res.json();
}

// 쿼리스트링 읽기
function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

// 영상 임베드 HTML 생성
function videoEmbedHTML(video) {
  if (!video) return "";
  if (video.provider === "youtube") {
    const id = video.id;
    return `
      <div class="embed">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${id}?rel=0"
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }
  if (video.provider === "vimeo") {
    const id = video.id;
    return `
      <div class="embed">
        <iframe
          src="https://player.vimeo.com/video/${id}"
          title="Vimeo video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }
  return "";
}

// XSS 방지
function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// 포트폴리오 목록 페이지
async function renderPortfolio() {
  const works = await loadWorks();
  const grid = document.getElementById("worksGrid");
  if (!grid) return;

  grid.innerHTML = works.map(w => `
    <a class="card" href="/work/?id=${encodeURIComponent(w.id)}">
      <div class="thumb" style="background-image:url('${escapeHTML(w.thumb)}')"></div>
      <div class="meta">
        <b>${escapeHTML(w.title)}</b>
        <span>${escapeHTML(w.type)} · ${escapeHTML(w.year)}</span>
      </div>
    </a>
  `).join("");
}

// 작업물 상세 페이지
async function renderWork() {
  const works = await loadWorks();
  const id = qs("id");
  const work = works.find(w => w.id === id);
  const root = document.getElementById("workRoot");
  if (!root) return;

  if (!work) {
    root.innerHTML = `<p>작업물을 찾을 수 없습니다. <a href="/portfolio/">포트폴리오로 돌아가기</a></p>`;
    return;
  }

  root.innerHTML = `
    <div class="workHeader">
      <div>
        <h1>${escapeHTML(work.title)}</h1>
        <p class="muted">${escapeHTML(work.type)} · ${escapeHTML(work.year)} · ${escapeHTML(work.client)}</p>
      </div>
      <a class="btn" href="/portfolio/">← Back</a>
    </div>

    ${videoEmbedHTML(work.video)}

    <div class="panel">
      <h2>Credits</h2>
      <ul>
        ${(work.credits || []).map(c => `<li>${escapeHTML(c)}</li>`).join("")}
      </ul>
    </div>
  `;
}

// DOM 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
  renderPortfolio().catch(console.error);
  renderWork().catch(console.error);
});
