<?php

declare(strict_types=1);

namespace ObsidianShare;

final class Template
{
    public function __construct(private readonly string $baseUrl)
    {
    }

    /**
     * @param array<string, mixed> $note
     * @param list<array<string, mixed>> $related
     */
    public function article(array $note, string $html, array $related = []): string
    {
        $title = self::escape($this->cleanTitle((string) $note['title']));
        $articleId = self::escape((string) $note['id']);
        $canonical = $this->baseUrl . '/s/' . rawurlencode((string) $note['canonical_path']);
        $tags = $this->tags((string) $note['tags_json']);
        $robots = (int) $note['no_index'] === 1 || (string) $note['access_mode'] !== 'public'
            ? 'noindex,nofollow,noarchive,nosnippet'
            : 'index,follow,max-image-preview:large';
        $published = self::escape(substr((string) $note['published_at'], 0, 10));
        $formattedDate = self::escape($this->formattedDate((string) $note['published_at']));
        $viewCount = max(0, (int) ($note['view_count'] ?? 0));
        $trackView = (string) $note['access_mode'] === 'public' ? ' data-track-view="1"' : '';
        $jsonLd = json_encode([
            '@context' => 'https://schema.org',
            '@type' => 'BlogPosting',
            'headline' => (string) $note['title'],
            'datePublished' => (string) $note['published_at'],
            'dateModified' => (string) $note['updated_at'],
            'mainEntityOfPage' => $canonical,
            'author' => ['@type' => 'Person', 'name' => 'Никита Малов'],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);

        $tagMarkup = '';
        foreach ($tags as $tag) {
            $tagMarkup .= '<span class="tag">' . self::escape($tag) . '</span>';
        }

        $relatedMarkup = '';
        if ($related !== []) {
            $items = '';
            foreach ($related as $relatedNote) {
                $relatedTitle = self::escape($this->cleanTitle((string) $relatedNote['title']));
                $relatedUrl = '/s/' . rawurlencode((string) $relatedNote['canonical_path']);
                $relatedTags = array_slice($this->tags((string) $relatedNote['tags_json']), 0, 3);
                $relatedTagMarkup = '';
                foreach ($relatedTags as $relatedTag) {
                    $relatedTagMarkup .= '<span>' . self::escape($relatedTag) . '</span>';
                }
                $items .= <<<HTML
<a class="related-link" href="{$relatedUrl}">
  <span class="related-title">{$relatedTitle}</span>
  <span class="related-tags">{$relatedTagMarkup}</span>
</a>
HTML;
            }
            $relatedMarkup = <<<HTML
<section class="related-articles">
  <h2>Похожие статьи</h2>
  <div class="related-list">{$items}</div>
</section>
HTML;
        }

        $body = <<<HTML
<main class="article-page" data-article-id="{$articleId}"{$trackView}>
  <div class="article-back">
    <a href="/">← <span>Все статьи</span></a>
  </div>
  <div class="article-layout">
    <article class="article-main">
      <header class="article-header">
        <h1>{$title}</h1>
        <div class="article-meta">
          <time datetime="{$published}">{$formattedDate}</time>
          <span>·</span>
          <span data-view-count>{$viewCount} просмотров</span>
        </div>
        <div class="tags">{$tagMarkup}</div>
      </header>
      <div class="markdown-body">{$html}</div>
      {$relatedMarkup}
      <div class="article-footer">
        <a href="/">← Все статьи</a>
      </div>
    </article>
    <aside class="article-sidebar" aria-label="Содержание">
      <div class="article-sidebar-sticky">
        <nav class="table-of-contents" data-table-of-contents hidden>
          <p>Содержание</p>
          <ul></ul>
        </nav>
      </div>
    </aside>
  </div>
</main>
<div class="reading-progress" aria-hidden="true"><span data-reading-progress></span></div>
<script type="application/ld+json">{$jsonLd}</script>
HTML;

        return $this->layout(
            (string) $note['title'],
            $body,
            $this->description((string) $note['markdown']),
            $robots,
            $canonical,
            '<script src="/assets/article.js" defer></script>',
        );
    }

    /** @param list<array<string, mixed>> $notes */
    public function home(array $notes): string
    {
        $cards = '';
        $tagCounts = [];
        foreach ($notes as $note) {
            $displayTitle = $this->cleanTitle((string) $note['title']);
            $title = self::escape($displayTitle);
            $url = '/s/' . rawurlencode((string) $note['canonical_path']);
            $date = self::escape($this->formattedDate((string) $note['published_at']));
            $reading = max(1, (int) $note['reading_time']);
            $excerpt = self::escape($this->description((string) $note['markdown']));
            $noteTags = $this->tags((string) $note['tags_json']);
            foreach ($noteTags as $tag) {
                $tagCounts[$tag] = ($tagCounts[$tag] ?? 0) + 1;
            }
            $tagMarkup = '';
            foreach (array_slice($noteTags, 0, 4) as $tag) {
                $tagMarkup .= '<span class="tag">' . self::escape($tag) . '</span>';
            }
            $tagData = self::escape(implode('|', array_map(
                static fn (string $tag): string => mb_strtolower($tag),
                $noteTags,
            )));
            $coverMarkup = '';
            if (is_string($note['cover_url'] ?? null) && $note['cover_url'] !== '') {
                $coverUrl = self::escape((string) $note['cover_url']);
                $coverMarkup = '<img class="card-cover" src="' . $coverUrl . '" alt="' . $title . '" loading="lazy" decoding="async">';
            } else {
                $firstLetter = self::escape(mb_strtoupper(mb_substr($displayTitle, 0, 1)));
                $coverMarkup = <<<HTML
<span class="card-letter" aria-hidden="true">{$firstLetter}</span>
<h2 class="card-cover-title">{$title}</h2>
HTML;
            }
            $cards .= <<<HTML
<a class="note-card" href="{$url}" data-search-card data-tags="{$tagData}">
  <span class="card-visual">{$coverMarkup}</span>
  <span class="card-body">
    <span class="card-title">{$title}</span>
    <span class="card-excerpt">{$excerpt}</span>
    <span class="card-bottom">
      <span class="card-tags">{$tagMarkup}</span>
      <span class="card-meta"><time>{$date}</time><span>{$reading} мин</span></span>
    </span>
  </span>
</a>
HTML;
        }
        if ($cards === '') {
            $cards = '<p class="empty-state">Публичных записей пока нет.</p>';
        }

        uasort($tagCounts, static function (int $left, int $right): int {
            return $right <=> $left;
        });
        $tagFilters = '';
        foreach ($tagCounts as $tag => $count) {
            $escapedTag = self::escape($tag);
            $normalizedTag = self::escape(mb_strtolower($tag));
            $tagFilters .= <<<HTML
<button class="tag-filter" type="button" data-tag-filter="{$normalizedTag}">
  {$escapedTag}<span>{$count}</span>
</button>
HTML;
        }
        $filterMarkup = $tagFilters === ''
            ? ''
            : '<div class="tag-filter-wrap"><div class="tag-filter-list">' . $tagFilters . '</div></div>';

        $body = <<<HTML
<main class="home-page">
  <header class="home-hero">
    <h1>Заметки</h1>
    <p>Об AI, разработке, продуктивности и не только</p>
    <a class="telegram-link" href="https://t.me/malovkaif" target="_blank" rel="noopener noreferrer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      <span>Телеграм-канал</span>
    </a>
    <label class="hero-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="search" placeholder="Поиск по статьям..." autocomplete="off" data-search-input>
    </label>
  </header>
  {$filterMarkup}
  <section aria-label="Публикации">
    <div class="note-grid" data-note-grid>{$cards}</div>
    <p class="empty-state" data-search-empty hidden>Ничего не найдено.</p>
    <span class="feed-sentinel" data-feed-sentinel aria-hidden="true"></span>
    <p class="feed-complete" data-result-count>{$this->countLabel(count($notes))}</p>
  </section>
</main>
HTML;

        return $this->layout(
            'Заметки Никиты Малова',
            $body,
            'Рабочие заметки Никиты Малова: бизнес, продукты, ИИ и разборы без лака.',
            'index,follow,max-image-preview:large',
            $this->baseUrl . '/',
            '<script src="/assets/search.js" defer></script>',
            true,
        );
    }

    /** @param array<string, mixed> $note */
    public function privateGate(array $note, string $csrf, ?string $error = null): string
    {
        $title = self::escape((string) $note['title']);
        $errorMarkup = $error === null ? '' : '<p class="form-error">' . self::escape($error) . '</p>';
        $body = <<<HTML
<main class="pin-gate-shell">
  <section class="pin-gate-card">
    <h1>Введите PIN-код</h1>
    <p>Для доступа к приватному материалу</p>
    {$errorMarkup}
    <form method="post">
      <input type="hidden" name="csrf" value="{$csrf}">
      <label class="sr-only" for="private-password">PIN-код для «{$title}»</label>
      <input id="private-password" class="pin-input" type="password" name="password" required autocomplete="current-password" inputmode="numeric" placeholder="----" maxlength="64" autofocus>
      <button type="submit">Открыть</button>
    </form>
    <div class="pin-help">
      <p>Нет PIN-кода?</p>
      <a href="https://t.me/mlvnik" target="_blank" rel="noopener noreferrer">Написать @mlvnik</a>
    </div>
  </section>
</main>
HTML;

        return $this->layout(
            'Закрытая запись',
            $body,
            'Закрытая запись',
            'noindex,nofollow,noarchive,nosnippet',
            null,
        );
    }

    public function notFound(): string
    {
        $body = <<<HTML
<main class="not-found">
  <div>
    <h1>404</h1>
    <p>Страница не найдена или была удалена</p>
    <a href="/">Вернуться на главную</a>
  </div>
</main>
HTML;
        return $this->layout('Страница не найдена', $body, 'Страница не найдена', 'noindex,nofollow', null);
    }

    public function layout(
        string $title,
        string $body,
        string $description,
        string $robots,
        ?string $canonical,
        string $extraHead = '',
        bool $showHeaderSearch = false,
    ): string {
        $fullTitle = self::escape($title . ' — Никита Малов');
        $description = self::escape($description);
        $robots = self::escape($robots);
        $canonicalTag = $canonical === null
            ? ''
            : '<link rel="canonical" href="' . self::escape($canonical) . '">';
        $headerSearch = $showHeaderSearch
            ? <<<HTML
<button class="header-search-toggle" type="button" aria-label="Поиск" aria-expanded="false" data-header-search-toggle>
  <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  <svg class="close-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
HTML
            : '';
        $headerPanel = $showHeaderSearch
            ? <<<HTML
<div class="header-search-panel" data-header-search-panel>
  <div class="header-search-inner">
    <label class="header-search-field">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="search" placeholder="Поиск по статьям..." autocomplete="off" data-search-input>
    </label>
  </div>
</div>
HTML
            : '';

        return <<<HTML
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{$fullTitle}</title>
  <meta name="description" content="{$description}">
  <meta name="robots" content="{$robots}">
  {$canonicalTag}
  <link rel="stylesheet" href="/assets/fonts/fonts.css">
  <link rel="stylesheet" href="/assets/app.css">
  <script src="/assets/metrika.js" defer></script>
  {$extraHead}
</head>
<body>
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand" href="/">Малов Никита</a>
      {$headerSearch}
    </div>
    {$headerPanel}
  </header>
  <div class="site-content">
  {$body}
  </div>
  <footer class="site-footer">
    <div class="site-footer-inner">
      <span>Малов Никита</span>
      <a href="https://t.me/malovkaif" target="_blank" rel="noopener noreferrer">Telegram</a>
    </div>
  </footer>
  <noscript><div><img src="https://mc.yandex.ru/watch/107578899" class="metric-pixel" alt=""></div></noscript>
</body>
</html>
HTML;
    }

    public static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }

    /** @return list<string> */
    private function tags(string $json): array
    {
        $tags = json_decode($json, true);
        if (!is_array($tags)) {
            return [];
        }
        return array_values(array_filter(array_map(
            static fn (mixed $tag): string => is_string($tag) ? trim($tag) : '',
            $tags,
        )));
    }

    private function description(string $markdown): string
    {
        $plain = preg_replace('/\A---\R.*?\R---\R/s', '', $markdown, 1) ?? $markdown;
        $plain = preg_replace('/!\[[^\]]*\]\([^)]*\)|!\[\[[^\]]+\]\]/u', ' ', $plain) ?? $plain;
        $plain = preg_replace('/[`*_>#\[\]()!~|:-]+/u', ' ', $plain) ?? $plain;
        $plain = preg_replace('/\s+/u', ' ', trim($plain)) ?? '';
        return mb_strlen($plain) > 220 ? rtrim(mb_substr($plain, 0, 219)) . '…' : $plain;
    }

    private function cleanTitle(string $title): string
    {
        $title = str_replace('_', ' ', $title);
        $title = preg_replace(
            '/[\x{1F1E0}-\x{1FAFF}\x{200D}\x{20E3}\x{2600}-\x{27BF}\x{FE00}-\x{FE0F}]/u',
            '',
            $title,
        ) ?? $title;
        return preg_replace('/\s{2,}/u', ' ', trim($title)) ?? trim($title);
    }

    private function formattedDate(string $value): string
    {
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            return substr($value, 0, 10);
        }
        $months = [
            1 => 'янв.',
            2 => 'февр.',
            3 => 'мар.',
            4 => 'апр.',
            5 => 'мая',
            6 => 'июн.',
            7 => 'июл.',
            8 => 'авг.',
            9 => 'сент.',
            10 => 'окт.',
            11 => 'нояб.',
            12 => 'дек.',
        ];
        return (int) gmdate('j', $timestamp)
            . ' ' . $months[(int) gmdate('n', $timestamp)]
            . ' ' . gmdate('Y', $timestamp) . ' г.';
    }

    private function countLabel(int $count): string
    {
        return $count . ' ' . ($count === 1 ? 'запись' : ($count < 5 ? 'записи' : 'записей'));
    }
}
