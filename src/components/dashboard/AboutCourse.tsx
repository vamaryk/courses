interface AboutCourseProps {
  aboutText?: string;
  whatIsText?: string;
  programText?: string;
}

const AboutCourse = ({ 
  aboutText = "Курс для начинающих верстальщиков сайтов на HTML и CSS. Разбираем реальные макеты, изучаем семантику языка, отрабатываем навыки в тренажере. В курсе более 190 заданий. Из них 150 – работа в тренажере.",
}: AboutCourseProps) => {
  return (
    <div className="space-y-2 px-2 mt-6">
        <h3 className="text-base font-semibold text-foreground mb-2">О курсе</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {aboutText}
        </p>
    </div>
  );
};

export default AboutCourse;
