const STEPS = [
  { tone: "gold", title: "احصد", en: "Harvest", text: "المربع الذهبي ناضج. اضغطه قبل أن يذبل." },
  { tone: "green", title: "ازرع", en: "Plant", text: "اختر بذرة من الأسفل واضغط أرضًا فاضية. الفجل رخيص وسريع." },
  { tone: "blue", title: "اسقِ", en: "Water", text: "القطرة الزرقاء توقف النمو. اسقِها فورًا." },
  { tone: "red", title: "اطرد", en: "Shoo", text: "الغراب يسرق الزرع. اضغطه، أو فعّل الفزّاعة لطرد الجميع." },
];

export function HelpPanel() {
  return (
    <div className="help">
      <div className="help-grid">
        {STEPS.map((s) => (
          <article key={s.en} className={`help-card tone-${s.tone}`}>
            <header>
              <b>{s.title}</b>
              <span>{s.en}</span>
            </header>
            <p>{s.text}</p>
          </article>
        ))}
      </div>
      <div className="help-extra">
        <p>
          <b>السلسلة:</b> احصد تباعًا خلال ثانيتين ونصف لمضاعفة النقاط حتى ×4. الحصاد المبكر يعطي مكافأة «في الوقت».
        </p>
        <p>
          <b>السعادة:</b> الذبول والسرقة والعشب يُنقصونها. عند الصفر تنتهي الجولة. الحصاد والمطر يعيدانها.
        </p>
      </div>
      <div className="keys">
        <span><kbd>أسهم</kbd> تحريك</span>
        <span><kbd>مسافة</kbd> تنفيذ</span>
        <span><kbd>1-4</kbd> بذور</span>
        <span><kbd>F</kbd> فزّاعة</span>
        <span><kbd>P</kbd> إيقاف</span>
        <span><kbd>R</kbd> إعادة</span>
      </div>
      <p className="touch-note">على اللمس: اضغط الأرض مباشرة. كل ضغطة تفعل الشيء الصحيح.</p>
    </div>
  );
}
