async function loadWorks() {
  const res = await fetch("/data/works.json");
  if (!res.ok) throw new Error("works.json 로드 실패");
  return await res.json();
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * works.json의 video 스키마를 모두 지원:
 * 1) "videoId": "ABCDEFGHIJK"
 * 2) "video": { "provider": "youtube", "id": "ABCDEFGHIJK" }
 * 3) (옵션) "video": { "provider": "vimeo", "id": "123456" }
 */
function normalizeVideo(work) {
  // videoId 우선
  if (work.videoId && typeof work.videoId === "string") {
    return { provider: "youtube", id: work.videoId };
  }
  // video 객체
  if (work.video && typeof work.video === "object") {
    const provider = String(work.video.provider || "").toLowerCase();
    const id = String(work.video.id || "");
    if ((provider === "youtube" || provider === "vimeo") && id) {
      return { provider, id };
    }
  }
  return null;
}

function videoEmbedHTML(video) {
  if (!video) return "";

  if (video.provider === "youtube") {
    const id = video.id;
    return `
      <div class="embed">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0"
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
          src="https://player.vimeo.com/video/${encodeURIComponent(id)}"
          title="Vimeo video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  return "";
}

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

  const video = normalizeVideo(work);

  // 오른쪽 메타(있는 것만 표시)
  const metaLines = [
    work.type ? `<div><b>Type</b>: ${escapeHTML(work.type)}</div>` : "",
    work.year ? `<div><b>Year</b>: ${escapeHTML(work.year)}</div>` : "",
    work.client ? `<div><b>Client</b>: ${escapeHTML(work.client)}</div>` : "",
  ].filter(Boolean).join("");

  const credits = Array.isArray(work.credits) ? work.credits : [];
  const creditsHTML = credits.length
    ? `
      <div class="workCredits">
        <h3>Credits</h3>
        <ul>
          ${credits.map(c => `<li>${escapeHTML(c)}</li>`).join("")}
        </ul>
      </div>
    `
    : "";

  root.innerHTML = `
    <div class="container">
      <div class="workLayout">
      <!-- LEFT: VIDEO -->
<div class="workMain">
  <div class="workBack">
    <a class="btn" href="/portfolio/">Back</a>
  </div>

  <div class="workPlayer">
    ${videoEmbedHTML(video)}
  </div>
</div>

<!-- RIGHT -->
  <aside class="workSidebar">
    <h1 class="workTitle">...</h1>
    <div class="workMeta">...</div>
    <div class="workCredits">...</div>
  </aside>

</div>
          ${creditsHTML}
        </aside>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderPortfolio().catch(console.error);
  renderWork().catch(console.error);
});
