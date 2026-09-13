export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. إذا المستخدم داس على زر البناء (POST API Request)
    if (request.method === "POST" && url.pathname === "/build") {
      try {
        const { desc, level, extras } = await request.json();

        const prompt = `أنت مهندس برمجيات محترف. أنشئ مشروعاً بمستوى (${level}).
        الميزات: ${extras.join(', ')}.
        الوصف: "${desc}".
        ارجع النتيجة حصرياً كـ JSON Array صالح بالصيغة:
        [{"filename": "index.html", "content": "..."}]
        ممنوع كتابة أي نص خارج الـ JSON.`;

        // الاتصال بسيرفرات قوقل من السيرفر الخلفي بأمان تام
        const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6KXZnD4wD6NCRirYlyT6iU0R7B8AOuPnvdQxnDt2qwtTA', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await geminiRes.json();
        
        if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
          throw new Error("الذكاء الاصطناعي رجع رد فارغ أو تم حظر الطلب. بسّط الوصف!");
        }

        let text = data.candidates[0].content.parts[0].text.trim();
        if(text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
        else if(text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();

        const files = JSON.parse(text);

        return new Response(JSON.stringify({ success: true, files }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 2. إذا المستخدم فتح الرابط طبيعي، نعرضله واجهة الـ HTML (Frontend)
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Software Builder 🚀</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<style>
  body { background: #05080c; color: #00ffaa; font-family: 'Courier New', monospace; padding: 10px; text-align: center; }
  .box { max-width: 750px; margin: 10px auto; border: 1px solid #00ffaa; padding: 20px; border-radius: 8px; background: #0b1017; text-align: right; box-shadow: 0 0 20px rgba(0,255,170,0.1); }
  h1 { font-size: 22px; color: #00ffaa; text-align: center; margin-bottom: 5px; }
  .sub { color: #888; font-size: 12px; text-align: center; margin-bottom: 20px; }
  label { font-size: 13px; color: #00ffaa; display: block; margin-top: 15px; font-weight: bold; }
  input, textarea, select { width: 100%; box-sizing: border-box; padding: 12px; margin-top: 5px; background: #030508; border: 1px solid #00ffaa; color: #fff; font-family: inherit; border-radius: 4px; outline: none; }
  textarea { height: 100px; resize: vertical; }
  .checkbox-group { display: flex; gap: 15px; margin-top: 10px; flex-wrap: wrap; }
  .checkbox-group label { display: inline; margin: 0; cursor: pointer; color: #ddd; }
  button { background: #00ffaa; color: #000; border: none; padding: 15px; font-weight: bold; cursor: pointer; border-radius: 4px; margin-top: 20px; width: 100%; font-size: 16px; transition: 0.3s; }
  button:hover { background: #00cc88; box-shadow: 0 0 15px #00ffaa; }
  #status { margin-top: 20px; background: #030508; padding: 15px; border-radius: 4px; border: 1px solid #1e293b; color: #00ffaa; font-size: 13px; white-space: pre-wrap; line-height: 1.6; text-align: left; direction: ltr; display: none; }
  .btn-group { display: flex; gap: 10px; margin-top: 15px; }
  .dl-btn { flex: 1; padding: 12px; text-align: center; font-weight: bold; border-radius: 4px; text-decoration: none; display: none; }
  .zip-btn { background: #ff0055; color: #fff; box-shadow: 0 0 10px #ff0055; }
</style>
</head>
<body>
<div class="box">
  <h1>[ AI SOFTWARE BUILDER 🚀 ]</h1>
  <div class="sub">ملف واحد، قوة خرافية وبدون بواري</div>

  <label>اسم المشروع:</label>
  <input type="text" id="pname" value="MyAwesomeApp">

  <label>مستوى المشروع:</label>
  <select id="plevel">
    <option value="Simple">🟢 بسيط (أساسيات فقط)</option>
    <option value="Advanced">🟡 متقدم (معمارية مرتبة)</option>
  </select>

  <label>خيارات سريعة:</label>
  <div class="checkbox-group">
    <label><input type="checkbox" id="c_auth"> تسجيل دخول</label>
    <label><input type="checkbox" id="c_db"> قاعدة بيانات</label>
  </div>

  <label>وصف المشروع بدقة:</label>
  <textarea id="pdesc" placeholder="اشرح التطبيق اللي تريده..."></textarea>

  <button onclick="startBuild()">🚀 BUILD PROJECT [ ابدأ البناء ]</button>

  <div id="status"></div>
  
  <div class="btn-group">
    <a href="#" id="dl-zip" class="dl-btn zip-btn">📦 تحميل ZIP</a>
  </div>
</div>

<script>
const delay = ms => new Promise(res => setTimeout(res, ms));

async function startBuild() {
  const name = document.getElementById('pname').value || 'AI_Project';
  const desc = document.getElementById('pdesc').value;
  const level = document.getElementById('plevel').value;
  const status = document.getElementById('status');
  const btnZip = document.getElementById('dl-zip');
  
  if(!desc) return alert('اكتب فكرة التطبيق الأول يا بطل!');

  btnZip.style.display = 'none';
  status.style.display = 'block';

  let extras = [];
  if(document.getElementById('c_auth').checked) extras.push("Authentication");
  if(document.getElementById('c_db').checked) extras.push("Database Setup");

  status.innerHTML = "[*] Initializing AI Architect...\n";
  await delay(600);
  status.innerHTML += "[*] Sending request to Worker Backend... ✅\n";
  await delay(600);
  status.innerHTML += "[*] Waiting for Gemini 2.5 Flash... ⏳\n";

  try {
    const res = await fetch('/build', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ desc, level, extras })
    });
    
    const result = await res.json();
    if (!result.success) throw new Error(result.error);

    const files = result.files;
    const zip = new JSZip();
    files.forEach(f => zip.file(f.filename, f.content));
    
    const content = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(content);

    status.innerHTML = status.innerHTML.replace("⏳", "✅");
    status.innerHTML += "[*] Packaging project into ZIP...   ✅\n\n";
    status.innerHTML += \`🚀 PROJECT READY! (\${files.length} Files Generated)\`;

    btnZip.href = url;
    btnZip.download = \`\${name}.zip\`;
    btnZip.style.display = 'block';

  } catch(e) {
    status.innerHTML += \`\\n[!] Error: \${e.message}\\nجرب مرة ثانية!\`;
  }
}
</script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};
