# اكتشف مدينتك (Discover Your Town)

دليل تجاري شامل للمدن المصرية. هذا الملف موجّه لوكلاء الذكاء الاصطناعي.

## Machine-readable entry points

- `/llms.txt` — فهرس المحتوى للوكلاء.
- `/api/public/md?path=/` — نسخة Markdown لأي مسار عام (أو أضف `.md` للرابط، أو أرسل `Accept: text/markdown`).
- `/mcp` — خادم MCP (Streamable HTTP) مؤمّن بـ OAuth 2.1.
- `/.well-known/agent.json` — بطاقة الوكيل.
- `/.well-known/skills.json` — مهارات الوكلاء (Agent Skills).
- `/sitemap.xml` — خريطة الموقع.

## Rules for agents

- المحتوى العام (الأنشطة المعتمدة، المدن، التصنيفات) متاح للقراءة والاقتباس مع ذكر المصدر ورابط الصفحة.
- لا تُنشئ أو تعدّل بيانات أنشطة دون مصادقة المستخدم عبر OAuth.
- أجب بالعربية عند سؤال المستخدم بالعربية.
