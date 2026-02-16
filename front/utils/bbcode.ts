/**
 * Simple BBCode to HTML parser
 */
export const bbcodeToHtml = (bbcode: string) => {
    if (!bbcode) return '';

    // Basic sanitation: Escape HTML characters if needed, 
    // but usually content is trusted or handled via dangerouslySetInnerHTML safely-ish
    let html = bbcode;

    // New tags requested
    html = html.replace(/\[CENTER\](.*?)\[\/CENTER\]/gi, '<div style="text-align: center;">$1</div>');
    html = html.replace(/\[FONT=(.*?)\](.*?)\[\/FONT\]/gi, '<span style="font-family: $1;">$2</span>');

    // Standard tags
    html = html.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>');
    html = html.replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>');
    html = html.replace(/\[u\](.*?)\[\/u\]/gi, '<span style="text-decoration: underline;">$1</span>');
    html = html.replace(/\[s\](.*?)\[\/s\]/gi, '<strike>$1</strike>');

    // URL and Images
    html = html.replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1" target="_blank" style="color: #FF4D00;">$2</a>');
    html = html.replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" style="max-width: 100%;" />');

    // Color and Size
    html = html.replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color: $1;">$2</span>');
    html = html.replace(/\[size=(.*?)\](.*?)\[\/size\]/gi, '<span style="font-size: $1px;">$2</span>');

    // Quote and Code
    html = html.replace(/\[quote\](.*?)\[\/quote\]/gi, '<blockquote style="border-left: 2px solid #FF4D00; padding-left: 10px; margin-left: 0;">$1</blockquote>');
    html = html.replace(/\[code\](.*?)\[\/code\]/gi, '<pre style="background: #222; padding: 10px; border-radius: 4px;"><code>$1</code></pre>');

    // Newlines to <br />
    html = html.replace(/\n/g, '<br />');

    return html;
};
