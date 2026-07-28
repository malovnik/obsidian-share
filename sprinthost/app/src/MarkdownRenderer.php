<?php

declare(strict_types=1);

namespace ObsidianShare;

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\Extension\HeadingPermalink\HeadingPermalinkExtension;
use League\CommonMark\MarkdownConverter;

final class MarkdownRenderer
{
    private MarkdownConverter $converter;

    public function __construct()
    {
        $environment = new Environment([
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
            'max_nesting_level' => 100,
            'heading_permalink' => [
                'html_class' => 'heading-anchor',
                'id_prefix' => 'section-',
                'fragment_prefix' => 'section-',
                'insert' => 'none',
                'apply_id_to_heading' => true,
            ],
        ]);
        $environment->addExtension(new CommonMarkCoreExtension());
        $environment->addExtension(new GithubFlavoredMarkdownExtension());
        $environment->addExtension(new HeadingPermalinkExtension());
        $this->converter = new MarkdownConverter($environment);
    }

    public function render(string $markdown): string
    {
        $markdown = $this->stripFrontmatter($markdown);
        $markdown = $this->normalizeObsidianSyntax($markdown);
        return (string) $this->converter->convert($markdown);
    }

    public function readingTime(string $markdown): int
    {
        $plain = preg_replace('/[`*_>#\[\]()!~|:-]+/u', ' ', $this->stripFrontmatter($markdown)) ?? '';
        $words = preg_split('/\s+/u', trim($plain), -1, PREG_SPLIT_NO_EMPTY);
        return max(1, (int) ceil(count($words ?: []) / 200));
    }

    public function excerpt(string $markdown, int $limit = 220): string
    {
        $plain = strip_tags($this->render($markdown));
        $plain = preg_replace('/\s+/u', ' ', trim(html_entity_decode($plain, ENT_QUOTES | ENT_HTML5, 'UTF-8'))) ?? '';
        if (mb_strlen($plain) <= $limit) {
            return $plain;
        }
        return rtrim(mb_substr($plain, 0, $limit - 1)) . '…';
    }

    private function stripFrontmatter(string $markdown): string
    {
        return preg_replace('/\A---\R.*?\R---\R/s', '', $markdown, 1) ?? $markdown;
    }

    private function normalizeObsidianSyntax(string $markdown): string
    {
        $markdown = preg_replace_callback(
            '/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/u',
            static function (array $match): string {
                $label = trim($match[2] ?? $match[1]);
                return '*[Изображение: ' . str_replace(['[', ']'], '', $label) . ']*';
            },
            $markdown,
        ) ?? $markdown;

        return preg_replace_callback(
            '/(?<!!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/u',
            static fn (array $match): string => trim($match[2] ?? $match[1]),
            $markdown,
        ) ?? $markdown;
    }
}
