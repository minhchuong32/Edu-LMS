import Card from "./Card";
import Badge from "./Badge";
import Button from "./Button";

const PagePlaceholder = ({ title, desc, icon, badgeText, badgeRole }) => (
  <div className="max-w-xl mx-auto mt-10">
    <Card className="text-center p-8 space-y-5">
      <div className="w-16 h-16 bg-primary-light text-primary rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="font-sans font-bold text-xl text-neutral-900 mb-1">{title}</h3>
        <p className="text-sm text-neutral-600 leading-relaxed mb-4">{desc}</p>
        <Badge role={badgeRole}>{badgeText}</Badge>
      </div>
      <div className="pt-2">
        <Button variant="outline" className="mx-auto" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </Card>
  </div>
);

export default PagePlaceholder;
