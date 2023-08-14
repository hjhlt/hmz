class AcGameMenu{
    constructor(root){
        this.root=root;
        this.$menu=$(`
<div class="ac-game-menu">
    <div class="ac-game-menu-field">
        <div class="ac-game-menu-field-item ac-game-menu-field-item-single-mode">
            单人模式
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-multi-mode">
            多人模式
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-settings">
            退出
        </div>
    </div>
</div>
`);
        this.$menu.hide();
        this.root.$ac_game.append(this.$menu);
        this.$single_mode=this.$menu.find('.ac-game-menu-field-item-single-mode');
        this.$multi_mode=this.$menu.find('.ac-game-menu-field-item-multi-mode');
        this.$settings=this.$menu.find('.ac-game-menu-field-item-settings');
        this.start();
    }

    start(){
        this.add_listening_events();
    }

    add_listening_events(){
        let outer=this;
        this.$single_mode.click(function(){
            outer.hide();
            outer.root.playground.show("single mode");
        });
        this.$multi_mode.click(function(){
            outer.hide();
            outer.root.playground.show("multi mode");
        });
        this.$settings.click(function(){
            outer.root.settings.logout_on_remote();
        });
    }

    show(){ //显示menu界面
        this.$menu.show();
    }

    hide(){ //关闭menu界面
        this.$menu.hide();
    }

}
let AC_GAME_OBJECTS=[];

class AcGameObject{
    constructor(){
        AC_GAME_OBJECTS.push(this);

        this.has_called_start=false;  //是否执行过start函数
        this.timedelta=0;  //当前帧距离上一帧的时间间隔

        this.uuid=this.create_uuid();
    }

    create_uuid(){
        let res="";
        for(let i=0;i<8;i++){
            let x=parseInt(Math.floor(Math.random()*10));
            res+=x;
        }
        return res;
    }

    start(){ //只会在第一帧执行一次

    }

    update(){ //每一帧都执行一次

    }

    on_destroy(){ //在被销毁前执行一次
        
    }

    destroy(){ //删掉该物体
        this.on_destroy();

        for(let i=0;i<AC_GAME_OBJECTS.length;i++){
            if(AC_GAME_OBJECTS[i]===this){
                AC_GAME_OBJECTS.splice(i,1);
                break;
            }
        }
    }
    game_over(){
        while(AC_GAME_OBJECTS.length>0){
            AC_GAME_OBJECTS.splice(0,1);
        }
    }

}
let last_timestamp=0;
let deltatime=0;
let lasttime=0;
let AC_GAME_ANIMATION=function(timestamp){
    if(deltatime>1000.0/60){
        deltatime-=1000.0/60;
        for(let i=0;i<AC_GAME_OBJECTS.length;i++){
            let obj=AC_GAME_OBJECTS[i];
            if(!obj.has_called_start){
                obj.start();
                obj.has_called_start=true;
            }
            else{
                obj.timedelta=timestamp-lasttime;
                obj.update();
            }
        }
        lasttime=timestamp;
    }
    if(last_timestamp!==0){
        deltatime+=timestamp-last_timestamp;
    }
    last_timestamp=timestamp;
    requestAnimationFrame(AC_GAME_ANIMATION);
}

requestAnimationFrame(AC_GAME_ANIMATION);
class ChatField{
    constructor(playground){
        this.playground=playground;
        this.$history=$('<div class="ac-game-chat-field-history tabindex" tabindex=0></div>');
        this.$input=$('<input type="text" class="ac-game-chat-field-input tabindex">');

        this.$history.hide();
        this.$input.hide();
        this.input_show=false;
        this.func_id=null;
        this.playground.$playground.append(this.$history);
        this.playground.$playground.append(this.$input);


        this.start();
    }

    start(){
        this.add_listening_events();
    }

    add_listening_events(){
        let outer=this;
        this.$input.on("contextmenu",function(){
            return false;
        });
        this.$history.on("contextmenu",function(){
            return false;
        });
        this.$input.keydown(function(e){
            if(e.which===13){
                let username=outer.playground.root.settings.username;
                let text=outer.$input.val();
                if(text){
                    outer.$input.val("");
                    outer.add_message(username,text);
                    outer.playground.mps.send_message(text);
                }
                outer.hide_input();
                return false;
            }
        });
        this.$history.mousedown(function(e){
            if(outer.playground.state!="fighting") return true;
            const rect=outer.playground.game_map.ctx.canvas.getBoundingClientRect();
            let scale=outer.playground.scale;
            if(e.which===3){
                let tx=(e.clientX-rect.left)/scale;
                let ty=(e.clientY-rect.top)/scale;
                outer.playground.players[0].move_to(tx,ty);
                if(outer.playground.mode==="multi mode"){
                    outer.playground.mps.send_move_to(tx,ty);
                }
            }
            else if(e.which===1){
                let tx=(e.clientX-rect.left)/scale;
                let ty=(e.clientY-rect.top)/scale;
                let player=outer.playground.players[0];
                if(player.cur_skill==="fireball"){
                    player.fireball_coldtime=3;
                    let fireball=player.shoot_fireball(tx,ty);
                    if(outer.playground.mode==="multi mode"){
                        outer.playground.mps.send_shoot_fireball(tx,ty,fireball.uuid);
                    }
                }
                else if(player.cur_skill==="flash"){
                    player.flash_coldtime=5;
                    player.flash(tx,ty);
                    if(outer.playground.mode==="multi mode"){
                        outer.playground.mps.send_flash(tx,ty);
                    }
                }
                player.cur_skill=null;
            }
            outer.playground.game_map.$canvas.focus();
        });
        this.$history.keydown(function(e){
            if(e.which===13){
                if(outer.playground.mode==="multi mode"){
                    outer.playground.chat_field.show_input();
                }
            }
            else if(e.which===27){
                if(outer.playground.mode==="multi mode"){
                    outer.playground.chat_field.hide_input();
                }
            }
            if(outer.playground.state!=="fighting"){
                return true;
            }
            let player=outer.playground.players[0];
            if(e.which===81){
                if(player.fireball_coldtime>player.eps) return true;
                player.cur_skill="fireball";
            }
            else if(e.which===70){
                if(player.flash_coldtime>player.eps) return true;
                player.cur_skill="flash";
            }
        });
    }

    render_message(message){
        return $(`<div>${message}</div>`);
    }

    add_message(username,text){
        let message=`[${username}]${text}`;
        this.$history.append(this.render_message(message));
        if(this.input_show===false){
            this.show_history();
        }
    }

    show_history(){

        this.$history.scrollTop(this.$history[0].scrollHeight);
        let outer=this;
        this.$history.fadeIn();
        this.delete_func_id();
        this.func_id=setTimeout(function(){
            outer.$history.fadeOut();
        },3000);
    }

    hide_history(){
        
    }

    show_input(){
        this.input_show=true;
        this.delete_func_id();
        this.$history.fadeIn();
        this.$history.scrollTop(this.$history[0].scrollHeight);
        this.$input.show();
        this.$input.focus();
    }

    hide_input(){
        this.input_show=false;
        this.show_history();
        this.$input.hide();
        this.playground.game_map.$canvas.focus();
    }

    delete_func_id(){
        if(this.func_id) {
            clearTimeout(this.func_id);
            this.func_id=null;
        }
    }

}
class GameMap extends AcGameObject{
    constructor(playground){
        super();
        this.playground=playground;
        this.$canvas=$(`
<canvas tabindex=0 class="tabindex">
    
</canvas>
`);
        this.ctx=this.$canvas[0].getContext('2d');
        this.ctx.canvas.width=this.playground.width;
        this.ctx.canvas.height=this.playground.height;
        this.playground.$playground.append(this.$canvas);
    }

    start(){
        this.$canvas.focus();
    }

    resize(){
        this.ctx.canvas.width=this.playground.width;
        this.ctx.canvas.height=this.playground.height;
    }

    update(){
        this.render();
    }

    render(){
        this.ctx.fillStyle="rgba(0,0,0)";
        this.ctx.fillRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
    }

}
class NoticeBoard extends AcGameObject{
    constructor(playground){
        super();
        this.playground=playground;
        this.ctx=this.playground.game_map.ctx;
        this.text="已就绪:0人";

        this.start();
    }

    start(){

    }

    write(text){
        this.text=text;
    }

    update(){

        this.render();
    }

    render(){
        this.ctx.font = "20px serif";
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.text, this.playground.width/2, 20);
    }


}
class Particle extends AcGameObject{
    constructor(playground,x,y,radius,vx,vy,color,speed,move_length){
        super();
        this.playground=playground;
        this.ctx=this.playground.game_map.ctx;
        this.x=x;
        this.y=y;
        this.radius=radius;
        this.vx=vx;
        this.vy=vy;
        this.color=color;
        this.speed=speed;
        this.initial_speed=this.speed;
        this.move_length=move_length;
        this.initial_move_length=this.move_length;
        this.friction=0.88;
        this.eps=3;
    }

    start(){

    }

    update(){
        if(this.move_length<this.initial_move_length/31 || this.speed<this.initial_speed/31){
            this.destroy();
            return false;
        }
        let moved=Math.min(this.move_length,this.speed*this.timedelta/1000);
        this.x+=this.vx*moved;
        this.y+=this.vy*moved;
        this.move_length-=moved;
        this.speed-=this.initial_speed/30;
        this.render();
    }

    render(){
        let scale=this.playground.scale;
        this.ctx.beginPath();
        this.ctx.arc(this.x*scale,this.y*scale,this.radius*scale,0,Math.PI*2,false);
        this.ctx.fillStyle=this.color;
        this.ctx.fill();
    }

}
class Player extends AcGameObject{
    constructor(playground,x,y,radius,color,speed,character,username,photo){
        super();
        this.playground=playground;
        this.ctx=this.playground.game_map.ctx;
        this.x=x;
        this.y=y;
        this.vx=0;
        this.vy=0;
        this.damage_x=0;
        this.damage_y=0;
        this.damage_speed=0;
        this.initial_damage_speed=0;
        this.move_length=0;
        this.radius=radius;
        this.color=color;
        this.speed=speed;
        this.character=character;
        this.username=username;
        this.photo=photo;
        this.eps=0.01;
        this.hp=100;

        this.spent_time=0;
        this.fireballs=[];

        this.cur_skill=null;

        this.eps=0.01
        if(this.character!=="robot"){
            this.img = new Image();
            this.img.src = this.photo;
        }
        if(this.character==="me"){
            this.fireball_coldtime=3;  //单位:秒
            this.fireball_img=new Image();
            this.fireball_img.src="./static/images/playground/skill/fireball.png";
            this.flash_coldtime=5;  //单位:秒
            this.flash_img=new Image();
            this.flash_img.src="./static/images/playground/skill/flash.png";
        }
    }

    start(){
        this.playground.player_count++;
        this.playground.notice_board.write("已就绪:"+this.playground.player_count+"人");
        if(this.playground.player_count>=3){
            this.playground.state="fighting";
            this.playground.notice_board.write("剩余存活"+this.playground.player_count+"人");
        }

        if(this.character==="me"){
            this.add_listening_events();
        }else if(this.character==="robot"){
            let tx=Math.random()*this.playground.width/this.playground.scale;
            let ty=Math.random()*this.playground.height/this.playground.scale;
            this.move_to(tx,ty);
        }
    }

    add_listening_events(){
        let outer=this;
        this.playground.game_map.$canvas.on("contextmenu",function(){
            return false;
        });
        this.playground.game_map.$canvas.mousedown(function(e){
            

            if(outer.playground.state!=="fighting") return true;
            const rect = outer.ctx.canvas.getBoundingClientRect();
            if(e.which===3){
                let tx=(e.clientX-rect.left)/outer.playground.scale;
                let ty=(e.clientY-rect.top)/outer.playground.scale;
                outer.move_to(tx,ty);

                if(outer.playground.mode==="multi mode"){
                    outer.playground.mps.send_move_to(tx,ty);
                }

            }
            else if(e.which===1){
                let tx=(e.clientX-rect.left)/outer.playground.scale;
                let ty=(e.clientY-rect.top)/outer.playground.scale;
                if(outer.cur_skill==="fireball"){
                    outer.fireball_coldtime=3;
                    let fireball=outer.shoot_fireball(tx,ty);
                    if(outer.playground.mode==="multi mode"){
                        outer.playground.mps.send_shoot_fireball(tx,ty,fireball.uuid);
                    }
                }
                else if(outer.cur_skill==="flash"){
                    outer.flash_coldtime=5;
                    outer.flash(tx,ty);
                    if(outer.playground.mode==="multi mode"){
                        outer.playground.mps.send_flash(tx,ty);
                    }
                }
                outer.cur_skill=null;
            }
        });
       this.playground.game_map.$canvas.keydown(function(e){
           if(e.which===13){
                if(outer.playground.mode==="multi mode"){  //打开聊天框
                    outer.playground.chat_field.show_input();
                }
            }else if(e.which===27){
                if(outer.playground.mode==="multi mode"){  //关闭聊天框
                    outer.playground.chat_field.hide_input();
                }
            }
            if(outer.playground.state!=="fighting"){
                return true;
            }
            if(e.which===81){  //q
                if(outer.fireball_coldtime>outer.eps) return true;
                outer.cur_skill="fireball";
            }
            else if(e.which===70){  //f
                if(outer.flash_coldtime>outer.eps) return true;
                outer.cur_skill="flash";
            }
        });
    }

    shoot_fireball(tx,ty){
        let x=this.x,y=this.y;
        let radius=0.01;
        let angle=Math.atan2(ty-this.y,tx-this.x);
        let vx=Math.cos(angle),vy=Math.sin(angle);
        let color="orange";
        let speed=1.0;
        let move_length=1.0;
        let fireball=new FireBall(this.playground,this,x,y,radius,vx,vy,color,speed,move_length,20);
        this.fireballs.push(fireball);
        return fireball;
    }

    destroy_fireball(uuid){
        for(let i=0;i<this.fireballs.length;i++){
            let fireball=this.fireballs[i];
            if(fireball.uuid===uuid){
                fireball.destroy();
                break;
            }
        }
    }

    flash(tx,ty){
        let d=this.get_dist(this.x,this.y,tx,ty);
        d=Math.min(d,0.4);
        let angle=Math.atan2(ty-this.y,tx-this.x);
        this.x+=d*Math.cos(angle);
        this.y+=d*Math.sin(angle);
        this.move_length=0;
    }

    get_dist(x1,y1,x2,y2){
        let dx=x1-x2;
        let dy=y1-y2;
        return Math.sqrt(dx*dx+dy*dy);
    }

    move_to(tx,ty){
        this.move_length=this.get_dist(this.x,this.y,tx,ty);
        let angle=Math.atan2(ty-this.y,tx-this.x);
        this.vx=Math.cos(angle);
        this.vy=Math.sin(angle);
    }

    is_attacked(angle,damage){
        for(let i=0;i<20+Math.random()*10;i++){
            let x=this.x,y=this.y;
            let radius=this.radius*(Math.random()*0.05+0.05);
            let angle=Math.PI*2*Math.random();
            let vx=Math.cos(angle),vy=Math.sin(angle);
            let color=this.color;
            let speed=this.speed*2+Math.random()*2*this.speed;
            let move_length=this.radius*Math.random()*2;
            new Particle(this.playground,x,y,radius,vx,vy,color,speed,move_length);
        }
        this.hp-=damage;
        if(this.hp<=0){
            if(this.is_me){
                
            }
            this.destroy();
            if(this.playground.players.length<=1){
            }
            return false;
        }
        this.damage_x=Math.cos(angle);
        this.damage_y=Math.sin(angle);
        this.damage_speed=damage/20;
        this.initial_damage_speed=this.damage_speed;
        this.speed*=1.25;
    }

    receive_attack(x,y,angle,damage,ball_uuid,attacker){
        attacker.destroy_fireball(ball_uuid);
        this.x=x;
        this.y=y;
        this.is_attacked(angle,damage);
    }


    update(){
        this.spent_time+=this.timedelta;
        if(this.character==="robot"){
            this.robot_attack();
        }
        if(this.character==="me"&&this.playground.state==="fighting"){
            this.update_coldtime();
        }
        this.update_move();
        this.render();
    }

    update_move(){  //更新玩家移动
        

        if(this.damage_speed>this.initial_damage_speed/31){
            this.vx=this.vy=0;
            this.move_length=0;
            this.x+=this.damage_x*this.damage_speed*this.timedelta/1000;
            this.y+=this.damage_y*this.damage_speed*this.timedelta/1000;
            this.damage_speed-=this.initial_damage_speed/30;
        }else{
            if(this.move_length<0.0001){
                this.move_length=0;
                this.vx=this.vy=0;
                if(this.character==="robot"){
                    let tx=Math.random()*this.playground.width/this.playground.scale;
                    let ty=Math.random()*this.playground.height/this.playground.scale;
                    this.move_to(tx,ty);
                }
            }
            else {
                let moved=Math.min(this.move_length,this.speed*this.timedelta/1000);
                this.x+=this.vx*moved;
                this.y+=this.vy*moved;
                this.move_length-=moved;
            }
        }
    }

    update_coldtime(){
        this.fireball_coldtime-=this.timedelta/1000;
        this.fireball_coldtime=Math.max(this.fireball_coldtime,0);
        this.flash_coldtime-=this.timedelta/1000;
        this.flash_coldtime=Math.max(this.flash_coldtime,0);
    }

    robot_attack(){
        if(Math.random()<1/180.0 && this.spent_time>=5000){
            let player=null;
            let nowid=0;
            let randomid=Math.floor(Math.random()*(this.playground.players.length))+1;
            for(let i=0;i<this.playground.players.length;i++){
                if(this.playground.players[i]!==this){
                    nowid++;
                }
                if(nowid===randomid){
                    player=this.playground.players[i];
                    break;
                }
            }
            if(player!=null){
                let randoms=Math.random()*2-1;
                let tx=player.x+randoms*player.vx*player.speed;
                let ty=player.y+randoms*player.vy*player.speed;
                this.shoot_fireball(tx,ty);
            }
        }
    }

    render(){
        let scale=this.playground.scale;
        if(this.character!=="robot"){
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.x*scale, this.y*scale, this.radius*scale, 0, Math.PI * 2, false);
            this.ctx.stroke();
            this.ctx.clip();
            this.ctx.drawImage(this.img, (this.x - this.radius)*scale, (this.y - this.radius)*scale, (this.radius * 2)*scale, (this.radius * 2)*scale);
            this.ctx.restore();
        }
        else{
            this.ctx.beginPath();
            this.ctx.arc(this.x*scale,this.y*scale,this.radius*scale,0,Math.PI*2);
            this.ctx.fillStyle=this.color;
            this.ctx.fill();
        }
        this.ctx.fillStyle="rgba(255,0,0,0.5)";
        this.ctx.fillRect((this.x-this.radius)*scale,(this.y-this.radius-0.01)*scale,this.radius*2*this.hp/100.0*scale,0.01*scale);
        if(this.character==="me"&&this.playground.state==="fighting"){
            this.render_skill_coldtime();
        }
    }

    render_skill_coldtime(){
        //火球cd
        let scale=this.playground.scale;
        let x=1.5,y=0.9,r=0.04;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x*scale, y*scale, r*scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.fireball_img, (x - r)*scale, (y - r)*scale, (r * 2)*scale, (r * 2)*scale);
        this.ctx.restore();
        if(this.fireball_coldtime>0){
            this.ctx.beginPath();
            this.ctx.moveTo(x*scale,y*scale);
            this.ctx.arc(x*scale,y*scale,r*scale,0-Math.PI/2,Math.PI*2*(1-this.fireball_coldtime/3)-Math.PI/2,true);
            this.ctx.lineTo(x*scale,y*scale);
            this.ctx.fillStyle="rgba(0,0,255,0.5)";
            this.ctx.fill();
        }
        //闪现cd
        x=1.6,y=0.9,r=0.04;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x*scale, y*scale, r*scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.flash_img, (x - r)*scale, (y - r)*scale, (r * 2)*scale, (r * 2)*scale);
        this.ctx.restore();
        if(this.flash_coldtime>0){
            this.ctx.beginPath();
            this.ctx.moveTo(x*scale,y*scale);
            this.ctx.arc(x*scale,y*scale,r*scale,0-Math.PI/2,Math.PI*2*(1-this.flash_coldtime/5)-Math.PI/2,true);
            this.ctx.lineTo(x*scale,y*scale);
            this.ctx.fillStyle="rgba(0,0,255,0.5)";
            this.ctx.fill();
        }
    }

    on_destroy(){
        this.playground.player_count--;
        if(this.character==="me"){

            this.playground.state="over";
        }
        if(this.playground.state==="fighting"){
            this.playground.notice_board.write("剩余存活"+this.playground.player_count+"人");
        }
        else if(this.playground.state==="over"){
            this.playground.notice_board.write("死废物你噶了!!!");
        }
        for(let i=0;i<this.playground.players.length;i++){
            let player=this.playground.players[i];
            if(player===this){
                this.playground.players.splice(i,1);
                break;
            }
        }
    }

}
class FireBall extends AcGameObject{
    constructor(playground,player,x,y,radius,vx,vy,color,speed,move_length,damage){
        super();
        this.playground=playground;
        this.player=player;
        this.ctx=this.playground.game_map.ctx;
        this.x=x;
        this.y=y;
        this.radius=radius;
        this.vx=vx;
        this.vy=vy;
        this.color=color;
        this.speed=speed;
        this.move_length=move_length;
        this.damage=damage;
        this.eps=0.1;
    }

    start(){

    }

    update(){
        if(this.move_length*this.playground.scale<this.eps){
            this.destroy();
            return false;
        }
        this.update_move();
        if(this.player.character!=="enemy"){
            this.update_attack();
        }
        this.render();
    }

    update_move(){
        let moved=Math.min(this.move_length,this.speed*this.timedelta/1000);
        this.x+=this.vx*moved;
        this.y+=this.vy*moved;
        this.move_length-=moved;
    }

    update_attack(){
        for(let i=0;i<this.playground.players.length;i++){
            let player=this.playground.players[i];
            if(this.player!==player&&this.is_collision(player)){
                this.attack(player);
                break;
            }
        }

    }

    is_collision(obj){
        let distance=this.get_dist(this.x,this.y,obj.x,obj.y);
        if(distance<this.radius+obj.radius)
            return true;
        return false;
    }

    get_dist(x1,y1,x2,y2){
        let dx=x1-x2;
        let dy=y1-y2;
        return Math.sqrt(dx*dx+dy*dy);
    }

    attack(player){
        this.destroy();
        let angle=Math.atan2(player.y-this.y,player.x-this.x);
        player.is_attacked(angle,this.damage);
        if(this.playground.mode==="multi mode"){
            this.playground.mps.send_attack(player.uuid,player.x,player.y,angle,this.damage,this.uuid);
        }

    }

    render(){
        let scale=this.playground.scale;
        this.ctx.beginPath();
        this.ctx.arc(this.x*scale,this.y*scale,this.radius*scale,0,Math.PI*2,false);
        this.ctx.fillStyle=this.color;
        this.ctx.fill();
    }

    on_destroy(){
        let fireballs=this.player.fireballs;
        for(let i=0;i<fireballs.length;i++){
            if(fireballs[i]===this){
                fireballs.splice(i,1);
                break;
            }
        }
    }

}
class MultiPlayerSocket{
    constructor(playground){
        this.playground=playground;

        this.ws=new WebSocket("wss://app4351.acapp.acwing.com.cn/wss/multiplayer/");

        this.start();
    }

    start(){
        this.receive();
    }

    receive(){
        let outer=this;
        this.ws.onmessage=function(e){
            let data=JSON.parse(e.data);
            let uuid=data.uuid;
            if(uuid===outer.uuid) return false;

            let event=data.event;
            if(event==="create_player"){
                outer.receive_create_player(uuid,data.username,data.photo);
            }else if(event==="move_to"){
                outer.receive_move_to(uuid,data.tx,data.ty);
            }else if(event==="shoot_fireball"){
                outer.receive_shoot_fireball(uuid,data.tx,data.ty,data.ball_uuid);
            }else if(event==="attack"){
                outer.receive_attack(uuid,data.attackee_uuid,data.x,data.y,data.angle,data.damage,data.ball_uuid);
            }else if(event==="flash"){
                outer.receive_flash(uuid,data.tx,data.ty);
            }else if(event==="message"){
                outer.receive_message(data.username,data.text);
            }
        };
    }

    send_create_player(username,photo){
        let outer=this;
        this.ws.send(JSON.stringify({
            'event':"create_player",
            'uuid':outer.uuid,
            'username':username,
            'photo':photo,
        }));
    }

    receive_create_player(uuid,username,photo){
        let player=new Player(
            this.playground,
            this.playground.width/2/this.playground.scale,
            0.5,
            0.05,
            "white",
            0.15,
            "enemy",
            username,
            photo,
        );
        player.uuid=uuid;
        this.playground.players.push(player);
    }

    get_player(uuid){
        let players=this.playground.players;
        for(let i=0;i<players.length;i++){
            let player=players[i];
            if(player.uuid===uuid){
                return player;
            }
        }
        return null;
    }

    send_move_to(tx,ty){
        let outer=this;
        this.ws.send(JSON.stringify({
            'event':"move_to",
            'uuid':outer.uuid,
            'tx':tx,
            'ty':ty,
        }));
    }

    receive_move_to(uuid,tx,ty){
        let player=this.get_player(uuid);
        if(player){
            player.move_to(tx,ty);
        }
    }

    send_shoot_fireball(tx,ty,ball_uuid){
        let outer=this;
        this.ws.send(JSON.stringify({
            'event':"shoot_fireball",
            'uuid':outer.uuid,
            'tx':tx,
            'ty':ty,
            'ball_uuid':ball_uuid,
        }));
    }

    receive_shoot_fireball(uuid,tx,ty,ball_uuid){
        let player=this.get_player(uuid);
        if(player){
            let fireball=player.shoot_fireball(tx,ty);
            fireball.uuid=ball_uuid;
        }
    }

    send_attack(attackee_uuid,x,y,angle,damage,ball_uuid){
        let outer=this;
        this.ws.send(JSON.stringify({
            'event':"attack",
            'uuid':outer.uuid,
            'attackee_uuid':attackee_uuid,
            'x':x,
            'y':y,
            'angle':angle,
            'damage':damage,
            'ball_uuid':ball_uuid,
        }));
    }

    receive_attack(uuid,attackee_uuid,x,y,angle,damage,ball_uuid){
        let attacker=this.get_player(uuid);
        let attackee=this.get_player(attackee_uuid);
        if(attacker&&attackee){
            attackee.receive_attack(x,y,angle,damage,ball_uuid,attacker);
        }
    }

    send_flash(tx,ty){
        let outer=this;
        this.ws.send(JSON.stringify({
            'event':"flash",
            'uuid':outer.uuid,
            'tx':tx,
            'ty':ty,
        }));
    }

    receive_flash(uuid,tx,ty){
        let player=this.get_player(uuid);
        if(player){
            player.flash(tx,ty);
        }
    }

    send_message(text){
        let outer=this;
        this.ws.send(JSON.stringify({
            'event':"message",
            'uuid':this.uuid,
            'username':outer.playground.root.settings.username,
            'text':text,
        }));
    }

    receive_message(username,text){
        this.playground.chat_field.add_message(username,text);
    }


}
class AcGamePlayground{
    constructor(root){
        this.root=root;
        this.$playground=$(`
<div class="ac-game-playground">

</div>
`);
        this.hide();

        this.root.$ac_game.append(this.$playground);

        this.start();

    }

    start(){
        let outer=this;
        $(window).resize(function(){
            outer.resize();
        });
    }

    resize(){
        this.width=this.$playground.width();
        this.height=this.$playground.height();
        let unit=Math.min(this.width/16,this.height/9);
        this.width=unit*16;
        this.height=unit*9;
        this.scale=this.height;
        if(this.game_map)this.game_map.resize();
    }

    get_random_color(){
        let colors=["blue","red","pink","grey","green","yellow","orange","purple"];
        return colors[Math.floor(Math.random()*8)];
    }

    show(mode){ //打开playground界面
        let outer=this;
        this.$playground.show();
        this.resize();
        this.game_map=new GameMap(this);

        this.mode=mode;
        this.state="waiting";  //waiting -> fighting ->over
        this.notice_board=new NoticeBoard(this);
        this.player_count=0;

        this.players=[];
        this.players.push(new Player(this,this.width/2/this.scale,this.height/2/this.scale,0.05,"rgba(255,255,255)",0.15,"me",this.root.settings.username,this.root.settings.photo));
        if(mode==="single mode"){
            for(let i=0;i<10;i++){
                this.players.push(new Player(this,this.width*Math.random()/this.scale,Math.random(),0.05,this.get_random_color(),0.15,"robot"));
            }
        }else if(mode==="multi mode"){
            this.chat_field=new ChatField(this);
            this.mps=new MultiPlayerSocket(this);
            this.mps.uuid=this.players[0].uuid;
            this.mps.ws.onopen=function(){
                outer.mps.send_create_player(outer.root.settings.username,outer.root.settings.photo);
            };
        }
    }
    hide(){ //关闭playground界面
        this.$playground.hide();
    }

}
class Settings{
    constructor(root){
        this.root=root;
        this.platform="WEB";
        if(this.root.AcWingOS) this.platform="ACAPP";
        this.username="";
        this.photo="";

        this.$settings=$(`
<div class="ac-game-settings">
    <div class="ac-game-settings-login">
        <div class="ac-game-settings-title">
            登录
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="用户名">
            </div>
        </div>
        <div class="ac-game-settings-password">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="密码">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>登录</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">
        </div>
        <div class="ac-game-settings-option">
            注册
        </div>
    </div>
    <div class="ac-game-settings-register">
        <div class="ac-game-settings-title">
            注册
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="用户名">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-first">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="密码">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-second">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="确认密码">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>注册</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">
        </div>
        <div class="ac-game-settings-option">
            登录
        </div>
    </div>
    </div>
</div>
`);
        this.$login=this.$settings.find(".ac-game-settings-login");
        this.$login_username=this.$login.find(".ac-game-settings-username input");
        this.$login_password=this.$login.find(".ac-game-settings-password input");
        this.$login_submit=this.$login.find(".ac-game-settings-submit button");
        this.$login_error_message=this.$login.find(".ac-game-settings-error-message");
        this.$login_register=this.$login.find(".ac-game-settings-option");

        this.$login.hide();


        this.$register=this.$settings.find(".ac-game-settings-register");
        this.$register_username=this.$register.find(".ac-game-settings-username input");
        this.$register_password=this.$register.find(".ac-game-settings-password-first input");
        this.$register_password_confirm=this.$register.find(".ac-game-settings-password-second input");
        this.$register_submit=this.$register.find(".ac-game-settings-submit button");
        this.$register_error_message=this.$register.find(".ac-game-settings-error-message");
        this.$register_login=this.$register.find(".ac-game-settings-option");


        this.$register.hide();

        this.$acwing_login=this.$settings.find('.ac-game-settings-acwing img');
        this.root.$ac_game.append(this.$settings);
        this.start();
    }

    start(){
        if(this.platform==="ACAPP"){
            this.getinfo_acapp();
        }else{
            this.getinfo_web();
        }
        this.add_listening_events();
    }

    add_listening_events(){
        let outer=this;
        this.add_listening_events_login();
        this.add_listening_events_register();

        this.$acwing_login.click(function(){
            outer.acwing_login();
        })
    }

    add_listening_events_login(){
        let outer=this;
        this.$login_register.click(function(){
            outer.register();
        });
        this.$login_submit.click(function(){
            outer.login_on_remote();
        });
    }

    add_listening_events_register(){
        let outer=this;
        this.$register_login.click(function(){
            outer.login();
        });
        this.$register_submit.click(function(){
            outer.register_on_remote();
        });
    }

    acwing_login(){
        $.ajax({
            url:"https://app4351.acapp.acwing.com.cn/settings/acwing/web/apply_code/",
            type:"GET",
            success:function(resp){
                if(resp.result==="success"){
                    window.location.replace(resp.apply_code_url);
                }
            }
        });
    }

    login_on_remote(){  //在远程服务器上登录
        let outer=this;
        let username=this.$login_username.val();
        let password=this.$login_password.val();
        this.$login_error_message.empty();

        outer.photo="./static/images/playground/player/initial_photo.png";

        outer.hide();
        outer.root.menu.show();
    }

    register_on_remote(){ //在远程服务器上注册
        let outer=this;
        let username=this.$register_username.val();
        let password=this.$register_password.val();
        let password_confirm=this.$register_password_confirm.val();
        this.$register_error_message.empty();

        $.ajax({
            url:"https://app4351.acapp.acwing.com.cn/settings/register/",
            type:"GET",
            data:{
                username:username,
                password:password,
                password_confirm:password_confirm,
            },
            success:function(resp){
                if(resp.result==="success"){
                    location.reload();  //刷新页面
                }
                else{
                    outer.$register_error_message.html(resp.result);
                }
            }
        });
    }

    logout_on_remote(){  //在远程服务器上登出
        if(this.platform==="ACAPP"){
            this.root.AcWingOS.api.window.close();
        }else{
            $.ajax({
                url:"https://app4351.acapp.acwing.com.cn/settings/logout/",
                type:"GET",
                success:function(resp){
                    if(resp.result==="success"){
                        location.reload();
                    }
                }
            });
        }
    }

    register(){  //打开注册界面
        this.$login.hide();
        this.$register.show();
    }

    login(){  //打开登录界面
        this.$register.hide();
        this.$login.show();
    }

    acapp_login(appid,redirect_uri,scope,state){
        let outer=this;
        this.root.AcWingOS.api.oauth2.authorize(appid, redirect_uri, scope, state, function(resp){
            if(resp.result==="success"){
                outer.username=resp.username;
                outer.photo=resp.photo;
                outer.hide();
                outer.root.menu.show();
            }
        });
    }

    getinfo_acapp(){
        let outer=this;
        $.ajax({
            url:"https://app4351.acapp.acwing.com.cn/settings/acwing/acapp/apply_code/",
            type:"GET",
            success:function(resp){
                if(resp.result==="success"){
                    outer.acapp_login(resp.appid,resp.redirect_uri,resp.scope,resp.state);
                }
            }
        });
    }

    getinfo_web(){
        let outer=this;
        outer.login();
    }

    show(){
        this.$settings.show();
    }

    hide(){
        this.$settings.hide();
    }

}
export class AcGame{
    constructor(id,AcWingOS){
        this.id=id;
        this.$ac_game=$('#'+id);
        this.AcWingOS=AcWingOS;

        this.settings=new Settings(this);
        this.menu=new AcGameMenu(this);
        this.playground=new AcGamePlayground(this);

        this.start();
    }

    start(){

    }

}

