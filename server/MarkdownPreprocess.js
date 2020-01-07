

let preprocessMdSpecialSymbols = function(txt) {
    let preprocessed = '';
    for (let i = 0; i < txt.length-1; ++i)
    {
        preprocessed += txt[i];
        if (txt[i] === '!' && txt[i+1] === '[')
        {
            preprocessed += '[';
            i += 2;
            while (txt[i] !== ']')
            {
                if (i === txt.length-1)
                {
                    console.log('error');
                    break; // put exception
                }
                else
                {
                    if (txt[i] === '_' && i >= 1 && txt[i-1] !== '\\')
                    {
                        preprocessed += '\\_'
                    }
                    else
                    {
                        preprocessed += txt[i];
                    }
                }
                ++i;
            }
            preprocessed += ']';
        } 
    }
    preprocessed += txt[txt.length-1];

    return preprocessed;
}

let preprocessMdImageTag = function(txt, dirName) {
    let idx = 0;
    let start = 0;
    while (start >= 0)
    {
        idx = txt.indexOf('![', start);
        if (idx === -1)
        {
            start = -1;
        }
        else
        {
            if (!txt.slice(idx+2).startsWith('/_articles/') && !txt.slice(idx+2).startsWith('/\\_articles/'))
            {
                txt = txt.slice(0, idx+2) + '/_articles/'+dirName + '/' + txt.slice(idx+2);
            }
            start = idx + 2;
        }
    }

    return txt;
}

let preprocessHtmlImageTag = function(txt, dirName) {
    let idx = 0;
    let start = 0;
    let prefix = '<img src="';
    while (start >= 0)
    {
        idx = txt.indexOf(prefix, start);
        if (idx === -1)
        {
            start = -1;
        }
        else
        {
            if (!txt.slice(idx + prefix.length).startsWith('/_articles/'))
            {
                txt = txt.slice(0, idx+prefix.length) + '/_articles/'+dirName + '/' + txt.slice(idx+prefix.length);
            }
            start = idx + 2;
        }
    }

    return txt;
}

let preprocessMarkdown = function(txt, dirName)
{
    txt = preprocessMdImageTag(txt, dirName);
    txt = preprocessMdSpecialSymbols(txt);
    return txt;
}


module.exports = 
{
    preprocessMdSpecialSymbols: preprocessMdSpecialSymbols,
    preprocessMdImageTag: preprocessMdImageTag,
    preprocessHtmlImageTag: preprocessHtmlImageTag,
    preprocessMarkdown: preprocessMarkdown,
    preprocessHtml: preprocessHtmlImageTag
}