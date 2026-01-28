interface AboutCourseProps {
  aboutText?: string;
  whatIsText?: string;
  programText?: string;
}

const AboutCourse = ({ 
  aboutText = "Курс для начинающих верстальщиков сайтов на HTML и CSS. Разбираем реальные макеты, изучаем семантику языка, отрабатываем навыки в тренажере. В курсе более 190 заданий. Из них 150 – работа в тренажере.",
  whatIsText = "HTML и CSS – две ключевые технологии, с помощью которых делают интернет-сайты. Именно с этих языков начинают свою карьеру многие программисты.",
  programText = "Интенсивная программа с короткими видео-уроками и большим количеством практики. Изучаем HTML5 и CSS3 на примере реального Photoshop-макета."
}: AboutCourseProps) => {
  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">О курсе</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {aboutText}
        </p>
      </div>
      
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Что такое HTML и CSS</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {whatIsText}
        </p>
      </div>
      
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">О программе</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {programText}
        </p>
      </div>
    </div>
  );
};

export default AboutCourse;
